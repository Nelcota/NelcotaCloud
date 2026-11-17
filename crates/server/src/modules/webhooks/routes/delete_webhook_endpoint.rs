use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::webhooks::rejection::webhooks_rejection::endpoint_error_response;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/webhooks/{endpoint_id}`: no more events; pending deliveries are given up.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/webhooks/{endpoint_id}",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("endpoint_id" = Uuid, Path, description = "Id of the endpoint")),
    responses(
        (status = 204, description = "Endpoint deleted"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such endpoint in this project", body = ErrorBody),
    )
)]
pub async fn delete_webhook_endpoint(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(endpoint_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    state
        .webhook_endpoint_store()
        .delete(admin.tenant_id, endpoint_id)
        .await
        .map_err(endpoint_error_response)?;
    // Its pending deliveries are given up on the worker's next look; wake it now.
    state.webhooks.hint(admin.tenant_id);

    Ok(StatusCode::NO_CONTENT)
}
