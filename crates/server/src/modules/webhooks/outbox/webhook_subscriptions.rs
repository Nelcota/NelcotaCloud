use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::webhooks::event::webhook_event_type::{WebhookEventType, known_event_types};

/// An enabled endpoint and the events it receives.
#[derive(Debug, Clone)]
pub struct SubscribedEndpoint {
    pub endpoint_id: Uuid,
    pub event_types: Vec<WebhookEventType>,
}

/// Reads committed subscriptions from the control plane when recording an event, regardless
/// of which API instance last changed the endpoints.
pub struct WebhookSubscriptions {
    control_plane_pool: PgPool,
}

impl WebhookSubscriptions {
    pub fn new(control_plane_pool: PgPool) -> Self {
        Self { control_plane_pool }
    }

    pub async fn of_tenant(&self, tenant_id: Uuid) -> Result<Vec<SubscribedEndpoint>, sqlx::Error> {
        let stored: Vec<(Uuid, Vec<String>)> = sqlx::query_as(
            "SELECT id, event_types FROM webhook_endpoints WHERE tenant_id = $1 AND is_enabled",
        )
        .bind(tenant_id)
        .fetch_all(&self.control_plane_pool)
        .await?;

        Ok(stored
            .into_iter()
            .map(|(endpoint_id, names)| SubscribedEndpoint {
                endpoint_id,
                event_types: known_event_types(&names),
            })
            .collect())
    }
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
