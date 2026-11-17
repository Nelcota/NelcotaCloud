use uuid::Uuid;

use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::modules::webhooks::outbox::webhook_hints::WebhookHints;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::modules::webhooks::outbox::webhook_subscriptions::WebhookSubscriptions;
use crate::shared::http::api_error::ApiError;

/// The webhook services requests use: subscriptions, wake-up hints and the HTTP transport.
pub struct WebhookRuntime {
    pub subscriptions: WebhookSubscriptions,
    pub hints: WebhookHints,
    pub transport: WebhookTransport,
}

impl WebhookRuntime {
    /// For a request that changes users: build it before the transaction, record inside it.
    pub async fn recorder(&self, tenant_id: Uuid) -> Result<WebhookRecorder, ApiError> {
        let endpoints = self
            .subscriptions
            .of_tenant(tenant_id)
            .await
            .map_err(ApiError::internal)?;

        Ok(WebhookRecorder::new(
            tenant_id,
            endpoints,
            self.hints.clone(),
        ))
    }

    /// Wakes the worker for a tenant whose deliveries were queued outside a recorder.
    pub fn hint(&self, tenant_id: Uuid) {
        self.hints.hint(tenant_id);
    }
}
