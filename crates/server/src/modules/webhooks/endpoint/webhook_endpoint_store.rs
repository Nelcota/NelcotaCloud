use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::webhooks::endpoint::webhook_endpoint_error::WebhookEndpointError;
use crate::modules::webhooks::endpoint::webhook_endpoint_repository::{
    NewWebhookEndpoint, StoredWebhookEndpoint, WebhookEndpointChanges, delete_endpoint,
    insert_endpoint, list_endpoints, replace_secret, update_endpoint, webhook_secret_context,
};
use crate::modules::webhooks::endpoint::webhook_endpoint_view::{
    WebhookEndpointView, WebhookEndpointWithSecret,
};
use crate::modules::webhooks::endpoint::webhook_url::{WebhookHostPolicy, WebhookUrl};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_subscriptions::WebhookSubscriptions;
use crate::modules::webhooks::scheduling::webhook_schedule_repository::mark_due_now;
use crate::modules::webhooks::signing::webhook_secret::WebhookSecret;
use crate::shared::crypto::secret_box::SecretBox;

/// A new endpoint as its owner typed it.
pub struct EndpointRequest<'a> {
    pub url: &'a str,
    pub event_types: &'a [WebhookEventType],
}

/// Changes to an endpoint; `None` keeps the current value.
pub struct EndpointUpdate<'a> {
    pub url: Option<&'a str>,
    pub event_types: Option<&'a [WebhookEventType]>,
    pub is_enabled: Option<bool>,
}

/// Saves a tenant's webhook endpoints. Every change drops the cached subscriptions, so the
/// next request records events for exactly what was saved.
pub struct WebhookEndpointStore<'a> {
    pub control_plane_pool: &'a PgPool,
    pub secret_box: &'a SecretBox,
    pub subscriptions: &'a WebhookSubscriptions,
    pub policy: WebhookHostPolicy,
}

impl WebhookEndpointStore<'_> {
    pub async fn list(
        &self,
        tenant_id: Uuid,
    ) -> Result<Vec<WebhookEndpointView>, WebhookEndpointError> {
        let stored = list_endpoints(self.control_plane_pool, tenant_id).await?;
        Ok(stored.into_iter().map(WebhookEndpointView::from).collect())
    }

    pub async fn create(
        &self,
        tenant_id: Uuid,
        request: EndpointRequest<'_>,
    ) -> Result<WebhookEndpointWithSecret, WebhookEndpointError> {
        let url = WebhookUrl::parse(request.url, self.policy)?;
        let event_types = event_type_names(request.event_types)?;
        let endpoint_id = Uuid::new_v4();
        let secret = WebhookSecret::generate();
        let context = webhook_secret_context(tenant_id, endpoint_id);
        let secret_ciphertext = self.secret_box.seal(secret.key(), &context)?;
        let endpoint = NewWebhookEndpoint {
            id: endpoint_id,
            tenant_id,
            url: url.as_str(),
            event_types: &event_types,
            secret_ciphertext: &secret_ciphertext,
        };

        let stored = insert_endpoint(self.control_plane_pool, endpoint)
            .await?
            .ok_or(WebhookEndpointError::LimitReached)?;

        Ok(self.reveal_secret(stored, &secret))
    }

    pub async fn update(
        &self,
        (tenant_id, endpoint_id): (Uuid, Uuid),
        update: EndpointUpdate<'_>,
    ) -> Result<WebhookEndpointView, WebhookEndpointError> {
        let url = update
            .url
            .map(|raw| WebhookUrl::parse(raw, self.policy))
            .transpose()?;
        let event_types = update.event_types.map(event_type_names).transpose()?;
        let changes = WebhookEndpointChanges {
            url: url.as_ref().map(WebhookUrl::as_str),
            event_types: event_types.as_deref(),
            is_enabled: update.is_enabled,
        };

        let mut transaction = self.control_plane_pool.begin().await?;
        let stored = update_endpoint(&mut transaction, (tenant_id, endpoint_id), changes)
            .await?
            .ok_or(WebhookEndpointError::NotFound)?;

        if update.is_enabled == Some(false) {
            mark_due_now(&mut *transaction, &[tenant_id]).await?;
        }

        transaction.commit().await?;
        self.subscriptions.forget(tenant_id);
        Ok(WebhookEndpointView::from(stored))
    }

    pub async fn delete(
        &self,
        tenant_id: Uuid,
        endpoint_id: Uuid,
    ) -> Result<(), WebhookEndpointError> {
        let mut transaction = self.control_plane_pool.begin().await?;

        if delete_endpoint(&mut transaction, tenant_id, endpoint_id).await? == false {
            return Err(WebhookEndpointError::NotFound);
        }

        // The worker gives up the endpoint's pending deliveries on its next look.
        mark_due_now(&mut *transaction, &[tenant_id]).await?;
        transaction.commit().await?;
        self.subscriptions.forget(tenant_id);

        Ok(())
    }

    /// The old secret keeps signing for a day, next to the new one.
    pub async fn rotate_secret(
        &self,
        tenant_id: Uuid,
        endpoint_id: Uuid,
    ) -> Result<WebhookEndpointWithSecret, WebhookEndpointError> {
        let secret = WebhookSecret::generate();
        let context = webhook_secret_context(tenant_id, endpoint_id);
        let secret_ciphertext = self.secret_box.seal(secret.key(), &context)?;
        let ids = (tenant_id, endpoint_id);

        let stored = replace_secret(self.control_plane_pool, ids, &secret_ciphertext)
            .await?
            .ok_or(WebhookEndpointError::NotFound)?;

        Ok(self.reveal_secret(stored, &secret))
    }

    fn reveal_secret(
        &self,
        stored: StoredWebhookEndpoint,
        secret: &WebhookSecret,
    ) -> WebhookEndpointWithSecret {
        self.subscriptions.forget(stored.tenant_id);

        WebhookEndpointWithSecret {
            endpoint: WebhookEndpointView::from(stored),
            secret: secret.encode(),
        }
    }
}

/// Stored names, without repeats; at least one is required.
fn event_type_names(event_types: &[WebhookEventType]) -> Result<Vec<String>, WebhookEndpointError> {
    let mut names: Vec<String> = event_types
        .iter()
        .map(|kind| kind.as_str().to_owned())
        .collect();
    names.sort_unstable();
    names.dedup();

    if names.is_empty() {
        return Err(WebhookEndpointError::NoEventTypes);
    }

    Ok(names)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stores_each_event_type_once() -> Result<(), WebhookEndpointError> {
        let names = event_type_names(&[
            WebhookEventType::UserDeleted,
            WebhookEventType::UserCreated,
            WebhookEventType::UserDeleted,
        ])?;

        assert_eq!(names, vec!["user.created", "user.deleted"]);
        Ok(())
    }

    #[test]
    fn requires_at_least_one_event_type() {
        assert!(matches!(
            event_type_names(&[]),
            Err(WebhookEndpointError::NoEventTypes)
        ));
    }
}
