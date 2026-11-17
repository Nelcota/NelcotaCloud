use axum::Json;
use axum::extract::{Path, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::webhooks::delivery::test_delivery::{TestDelivery, TestDeliveryResult};
use crate::modules::webhooks::rejection::webhooks_rejection::endpoint_error_response;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /admin/webhooks/{endpoint_id}/test`: sends a signed `webhook.test` event now and
/// answers with what the endpoint replied.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/webhooks/{endpoint_id}/test",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("endpoint_id" = Uuid, Path, description = "Id of the endpoint")),
    responses(
        (status = 200, description = "The endpoint's answer (also when it failed)", body = TestDeliveryResult),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such endpoint in this project", body = ErrorBody),
    )
)]
pub async fn send_test_webhook(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(endpoint_id): Path<Uuid>,
) -> Result<Json<TestDeliveryResult>, ApiError> {
    let test_delivery = TestDelivery {
        control_plane_pool: &state.control_plane_pool,
        secret_box: &state.secret_box,
        transport: &state.webhooks.transport,
    };
    let result = test_delivery
        .send(admin.tenant_id, endpoint_id)
        .await
        .map_err(endpoint_error_response)?;

    Ok(Json(result))
}
