use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::webhooks::delivery::delivery_log_repository::requeue_delivery;
use crate::modules::webhooks::routes::endpoint_ownership::require_endpoint;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /admin/webhooks/{endpoint_id}/deliveries/{delivery_id}/retry`: sends the delivery
/// again right away, whatever its state.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/webhooks/{endpoint_id}/deliveries/{delivery_id}/retry",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(
        ("endpoint_id" = Uuid, Path, description = "Id of the endpoint"),
        ("delivery_id" = Uuid, Path, description = "Id of the delivery"),
    ),
    responses(
        (status = 202, description = "Queued; it is sent within seconds"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such endpoint or delivery in this project", body = ErrorBody),
    )
)]
pub async fn retry_webhook_delivery(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path((endpoint_id, delivery_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    let tenant_id = admin.tenant_id;
    require_endpoint(&state, tenant_id, endpoint_id).await?;

    if requeue_delivery(&admin.pool, endpoint_id, delivery_id).await? == false {
        return Err(ApiError::NotFound("webhook delivery"));
    }

    state.webhooks.hint(tenant_id);

    Ok(StatusCode::ACCEPTED)
}
