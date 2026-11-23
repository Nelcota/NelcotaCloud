use axum::Json;
use axum::extract::{Path, State};
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::webhooks::delivery::test_delivery::{TestDelivery, TestDeliveryResult};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::rejection::webhooks_rejection::endpoint_error_response;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// What to send; with no body (or no type), a `webhook.test` event.
#[derive(Deserialize, Validate, ToSchema)]
pub struct TestWebhookBody {
    /// Sends a made-up event of this type instead, to exercise the receiver's real handler.
    pub event_type: Option<WebhookEventType>,
}

/// `POST /admin/webhooks/{endpoint_id}/test`: sends a signed test event now and answers with
/// what the endpoint replied.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/webhooks/{endpoint_id}/test",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("endpoint_id" = Uuid, Path, description = "Id of the endpoint")),
    request_body(content = Option<TestWebhookBody>, description = "Optional: the event type to imitate"),
    responses(
        (status = 200, description = "The endpoint's answer (also when it failed)", body = TestDeliveryResult),
        (status = 400, description = "Unknown event type", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such endpoint in this project", body = ErrorBody),
        (status = 429, description = "Too many test events and resends for this project", body = ErrorBody),
    )
)]
pub async fn send_test_webhook(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(endpoint_id): Path<Uuid>,
    body: Option<ValidatedJson<TestWebhookBody>>,
) -> Result<Json<TestDeliveryResult>, ApiError> {
    let event_type = body.and_then(|ValidatedJson(body)| body.event_type);
    state.webhooks.manual_sends.check(admin.tenant_id)?;
    let test_delivery = TestDelivery {
        control_plane_pool: &state.control_plane_pool,
        secret_box: &state.secret_box,
        transport: &state.webhooks.transport,
    };
    let result = test_delivery
        .send((admin.tenant_id, endpoint_id), event_type)
        .await
        .map_err(endpoint_error_response)?;

    Ok(Json(result))
}
