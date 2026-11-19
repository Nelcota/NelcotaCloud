use serde::Serialize;
use serde_json::json;
use sqlx::PgPool;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::webhooks::delivery::delivery_targets::delivery_target;
use crate::modules::webhooks::delivery::webhook_request::{DeliveryOutcome, WebhookMessage};
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::modules::webhooks::endpoint::webhook_endpoint_error::WebhookEndpointError;
use crate::modules::webhooks::endpoint::webhook_endpoint_repository::find_endpoint;
use crate::shared::crypto::secret_box::SecretBox;

const TEST_EVENT_TYPE: &str = "webhook.test";

/// What the receiver answered to the test event.
#[derive(Debug, Serialize, ToSchema)]
pub struct TestDeliveryResult {
    pub delivered: bool,
    /// HTTP status the endpoint answered; `null` when it could not be reached.
    pub response_status: Option<u16>,
    pub error: Option<String>,
}

/// Sends a signed `webhook.test` event right away and reports the answer, so owners can check
/// their receiver (URL, signature check) without waiting for a real event. Not queued.
pub struct TestDelivery<'a> {
    pub control_plane_pool: &'a PgPool,
    pub secret_box: &'a SecretBox,
    pub transport: &'a WebhookTransport,
}

impl TestDelivery<'_> {
    pub async fn send(
        &self,
        tenant_id: Uuid,
        endpoint_id: Uuid,
    ) -> Result<TestDeliveryResult, WebhookEndpointError> {
        let stored = find_endpoint(self.control_plane_pool, tenant_id, endpoint_id).await?;
        let stored = stored.ok_or(WebhookEndpointError::NotFound)?;
        let target = delivery_target(self.secret_box, stored)?;
        let message = test_message(endpoint_id);
        let outcome = self.transport.send(&target, &message).await;

        Ok(TestDeliveryResult::from(outcome))
    }
}

fn test_message(endpoint_id: Uuid) -> WebhookMessage {
    let timestamp = OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_default();
    let payload = json!({
        "type": TEST_EVENT_TYPE,
        "timestamp": timestamp,
        "data": { "endpoint_id": endpoint_id },
    });

    WebhookMessage {
        id: format!("test_{}", Uuid::new_v4()),
        body: payload.to_string(),
    }
}

impl From<DeliveryOutcome> for TestDeliveryResult {
    fn from(outcome: DeliveryOutcome) -> Self {
        match outcome {
            DeliveryOutcome::Delivered { status } => Self {
                delivered: true,
                response_status: Some(status),
                error: None,
            },
            DeliveryOutcome::Failed { status, error } => Self {
                delivered: false,
                response_status: status,
                error: Some(error),
            },
        }
    }
}
