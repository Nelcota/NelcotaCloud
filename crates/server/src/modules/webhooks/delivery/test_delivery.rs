use serde::Serialize;
use serde_json::json;
use sqlx::PgPool;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::webhooks::delivery::delivery_targets::delivery_target;
use crate::modules::webhooks::delivery::webhook_request::{
    AttemptReport, DeliveryOutcome, WebhookMessage,
};
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::modules::webhooks::endpoint::webhook_endpoint_error::WebhookEndpointError;
use crate::modules::webhooks::endpoint::webhook_endpoint_repository::find_endpoint;
use crate::modules::webhooks::event::sample_event::sample_data;
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::shared::crypto::secret_box::SecretBox;

const TEST_EVENT_TYPE: &str = "webhook.test";

/// What the receiver answered to the test event.
#[derive(Debug, Serialize, ToSchema)]
pub struct TestDeliveryResult {
    pub delivered: bool,
    /// HTTP status the endpoint answered; `null` when it could not be reached.
    pub response_status: Option<u16>,
    pub error: Option<String>,
    /// How long the endpoint took to answer; `null` when it never answered.
    pub duration_ms: Option<i32>,
    /// The start of the endpoint's answer when it refused the event.
    pub response_excerpt: Option<String>,
}

/// Sends a signed test event right away and reports the answer, so owners can check their
/// receiver (URL, signature check, handler) without waiting for a real event. Not queued.
pub struct TestDelivery<'a> {
    pub control_plane_pool: &'a PgPool,
    pub secret_box: &'a SecretBox,
    pub transport: &'a WebhookTransport,
}

impl TestDelivery<'_> {
    /// Sends a `webhook.test` event, or a made-up event of `event_type` when one is given.
    pub async fn send(
        &self,
        (tenant_id, endpoint_id): (Uuid, Uuid),
        event_type: Option<WebhookEventType>,
    ) -> Result<TestDeliveryResult, WebhookEndpointError> {
        let stored = find_endpoint(self.control_plane_pool, tenant_id, endpoint_id).await?;
        let stored = stored.ok_or(WebhookEndpointError::NotFound)?;
        let target = delivery_target(self.secret_box, stored)?;
        let message = test_message(endpoint_id, event_type);
        let report = self.transport.send(&target, &message).await;

        Ok(TestDeliveryResult::from(report))
    }
}

/// The `test_` id prefix tells receivers it is a test, whatever its type.
fn test_message(endpoint_id: Uuid, event_type: Option<WebhookEventType>) -> WebhookMessage {
    let timestamp = OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_default();
    let (kind, data) = match event_type {
        Some(chosen) => (chosen.as_str(), sample_data(chosen)),
        None => (TEST_EVENT_TYPE, json!({ "endpoint_id": endpoint_id })),
    };
    let payload = json!({ "type": kind, "timestamp": timestamp, "data": data });

    WebhookMessage {
        id: format!("test_{}", Uuid::new_v4()),
        body: payload.to_string(),
    }
}

impl From<AttemptReport> for TestDeliveryResult {
    fn from(report: AttemptReport) -> Self {
        let duration_ms = report.duration_ms;

        match report.outcome {
            DeliveryOutcome::Delivered { status } => Self {
                delivered: true,
                response_status: Some(status),
                error: None,
                duration_ms,
                response_excerpt: None,
            },
            DeliveryOutcome::Failed { status, error } => Self {
                delivered: false,
                response_status: status,
                error: Some(error),
                duration_ms,
                response_excerpt: report.response_excerpt,
            },
        }
    }
}
