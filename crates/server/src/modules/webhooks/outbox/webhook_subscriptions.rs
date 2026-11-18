use std::sync::Arc;
use std::time::Duration;

use moka::future::Cache;
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::webhooks::endpoint::webhook_endpoint_repository::list_endpoints;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::shared::cache::cache_generation::CacheGeneration;

/// Changes made through this instance invalidate at once; the time bound only matters when
/// another instance changed them.
const SUBSCRIPTIONS_TIME_TO_LIVE: Duration = Duration::from_secs(5 * 60);
const MAX_CACHED_TENANTS: u64 = 10_000;

#[derive(Debug, thiserror::Error)]
pub enum SubscriptionsError {
    #[error("database error while loading webhook endpoints: {0}")]
    Database(#[from] sqlx::Error),
}

/// An enabled endpoint and the events it receives.
#[derive(Debug, Clone)]
pub struct SubscribedEndpoint {
    pub endpoint_id: Uuid,
    pub event_types: Vec<WebhookEventType>,
}

/// Which endpoints of a tenant want which events, cached so requests that change users do not
/// read the control plane: most tenants have no endpoint, and then nothing is recorded.
pub struct WebhookSubscriptions {
    control_plane_pool: PgPool,
    cache: Cache<(Uuid, u64), Arc<Vec<SubscribedEndpoint>>>,
    generation: CacheGeneration,
}

impl WebhookSubscriptions {
    pub fn new(control_plane_pool: PgPool) -> Self {
        let cache = Cache::builder()
            .max_capacity(MAX_CACHED_TENANTS)
            .time_to_live(SUBSCRIPTIONS_TIME_TO_LIVE)
            .build();

        Self {
            control_plane_pool,
            cache,
            generation: CacheGeneration::new(),
        }
    }

    /// Concurrent misses for one tenant share a single load.
    pub async fn of_tenant(
        &self,
        tenant_id: Uuid,
    ) -> Result<Arc<Vec<SubscribedEndpoint>>, Arc<SubscriptionsError>> {
        let cache_key = (tenant_id, self.generation.of(tenant_id));

        self.cache
            .try_get_with(cache_key, self.load(tenant_id))
            .await
    }

    /// Forgets the tenant's cached subscriptions after an endpoint change committed.
    pub fn forget(&self, tenant_id: Uuid) {
        self.generation.advance(tenant_id);
    }

    async fn load(
        &self,
        tenant_id: Uuid,
    ) -> Result<Arc<Vec<SubscribedEndpoint>>, SubscriptionsError> {
        let stored = list_endpoints(&self.control_plane_pool, tenant_id).await?;
        let mut subscribed = Vec::with_capacity(stored.len());

        for endpoint in stored.into_iter().filter(|endpoint| endpoint.is_enabled) {
            let event_types = known_event_types(&endpoint.event_types);
            subscribed.push(SubscribedEndpoint {
                endpoint_id: endpoint.id,
                event_types,
            });
        }

        Ok(Arc::new(subscribed))
    }
}

/// Stored event types this version knows. A name it does not know (an event removed later, a
/// manual edit) is logged and skipped: it must not fail every request that changes a user.
pub fn known_event_types(raw: &[String]) -> Vec<WebhookEventType> {
    raw.iter()
        .filter_map(|name| match WebhookEventType::parse(name) {
            Ok(event_type) => Some(event_type),
            Err(error) => {
                tracing::warn!(%error, "skipping an unknown stored webhook event type");
                None
            }
        })
        .collect()
}

/// The endpoints that receive `event_type`.
pub fn endpoints_for(endpoints: &[SubscribedEndpoint], event_type: WebhookEventType) -> Vec<Uuid> {
    endpoints
        .iter()
        .filter(|endpoint| endpoint.event_types.contains(&event_type))
        .map(|endpoint| endpoint.endpoint_id)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_only_endpoints_subscribed_to_the_event() {
        let created_only = SubscribedEndpoint {
            endpoint_id: Uuid::new_v4(),
            event_types: vec![WebhookEventType::UserCreated],
        };
        let everything = SubscribedEndpoint {
            endpoint_id: Uuid::new_v4(),
            event_types: WebhookEventType::ALL.to_vec(),
        };
        let endpoints = [created_only.clone(), everything.clone()];

        assert_eq!(
            endpoints_for(&endpoints, WebhookEventType::UserCreated),
            vec![created_only.endpoint_id, everything.endpoint_id]
        );
        assert_eq!(
            endpoints_for(&endpoints, WebhookEventType::UserDeleted),
            vec![everything.endpoint_id]
        );
    }
}
