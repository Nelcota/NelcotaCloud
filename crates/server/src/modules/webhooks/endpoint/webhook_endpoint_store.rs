use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::webhooks::endpoint::webhook_endpoint_error::WebhookEndpointError;
use crate::modules::webhooks::endpoint::webhook_endpoint_repository::{
    NewWebhookEndpoint, WebhookEndpointChanges, delete_endpoint, find_endpoint, insert_endpoint,
    list_endpoints, replace_secret, update_endpoint, webhook_secret_context,
};
use crate::modules::webhooks::endpoint::webhook_endpoint_view::{
    WebhookEndpointView, WebhookEndpointWithSecret,
};
use crate::modules::webhooks::endpoint::webhook_url::{WebhookHostPolicy, WebhookUrl};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_subscriptions::WebhookSubscriptions;
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
        let views = stored.into_iter().map(WebhookEndpointView::try_from);

        Ok(views.collect::<Result<_, _>>()?)
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

        if insert_endpoint(self.control_plane_pool, endpoint).await? == false {
            return Err(WebhookEndpointError::LimitReached);
        }

        self.with_secret(tenant_id, endpoint_id, &secret).await
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

        if update_endpoint(self.control_plane_pool, (tenant_id, endpoint_id), changes).await?
            == false
        {
            return Err(WebhookEndpointError::NotFound);
        }

        self.subscriptions.forget(tenant_id).await;

        self.view(tenant_id, endpoint_id).await
    }

    pub async fn delete(
        &self,
        tenant_id: Uuid,
        endpoint_id: Uuid,
    ) -> Result<(), WebhookEndpointError> {
        if delete_endpoint(self.control_plane_pool, tenant_id, endpoint_id).await? == false {
            return Err(WebhookEndpointError::NotFound);
        }

        self.subscriptions.forget(tenant_id).await;

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

        if replace_secret(self.control_plane_pool, ids, &secret_ciphertext).await? == false {
            return Err(WebhookEndpointError::NotFound);
        }

        self.with_secret(tenant_id, endpoint_id, &secret).await
    }

    async fn view(
        &self,
        tenant_id: Uuid,
        endpoint_id: Uuid,
    ) -> Result<WebhookEndpointView, WebhookEndpointError> {
        let stored = find_endpoint(self.control_plane_pool, tenant_id, endpoint_id).await?;
        let Some(stored) = stored else {
            return Err(WebhookEndpointError::NotFound);
        };

        Ok(WebhookEndpointView::try_from(stored)?)
    }

    async fn with_secret(
        &self,
        tenant_id: Uuid,
        endpoint_id: Uuid,
        secret: &WebhookSecret,
    ) -> Result<WebhookEndpointWithSecret, WebhookEndpointError> {
        self.subscriptions.forget(tenant_id).await;
        let endpoint = self.view(tenant_id, endpoint_id).await?;

        Ok(WebhookEndpointWithSecret {
            endpoint,
            secret: secret.encode(),
        })
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
