use uuid::Uuid;

use crate::modules::webhooks::delivery::manual_send_limiter::ManualSendLimiter;
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::modules::webhooks::outbox::webhook_hints::WebhookHints;
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;
use crate::modules::webhooks::outbox::webhook_subscriptions::WebhookSubscriptions;
use crate::shared::http::api_error::ApiError;

/// The tenant's subscriptions could not be loaded, so its events cannot be recorded.
#[derive(Debug, thiserror::Error)]
#[error("webhook subscriptions are unavailable: {0}")]
pub struct RecorderUnavailable(#[from] sqlx::Error);

impl From<RecorderUnavailable> for ApiError {
    fn from(error: RecorderUnavailable) -> Self {
        Self::internal(error)
    }
}

/// The webhook services requests use: subscriptions, wake-up hints, the HTTP transport and
/// the limit on sends owners trigger by hand.
pub struct WebhookRuntime {
    pub subscriptions: WebhookSubscriptions,
    pub hints: WebhookHints,
    pub transport: WebhookTransport,
    pub manual_sends: ManualSendLimiter,
}

impl WebhookRuntime {
    /// For a request that changes users: build it before the transaction, record inside it.
    pub async fn recorder(&self, tenant_id: Uuid) -> Result<WebhookRecorder, RecorderUnavailable> {
        let endpoints = self.subscriptions.of_tenant(tenant_id).await?;

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
