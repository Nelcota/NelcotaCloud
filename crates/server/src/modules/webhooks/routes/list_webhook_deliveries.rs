use axum::Json;
use axum::extract::{Path, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::webhooks::delivery::delivery_log_repository::{
    DeliveryLogEntry, list_deliveries,
};
use crate::modules::webhooks::routes::endpoint_ownership::require_endpoint;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/webhooks/{endpoint_id}/deliveries`: the endpoint's 50 newest deliveries.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/webhooks/{endpoint_id}/deliveries",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("endpoint_id" = Uuid, Path, description = "Id of the endpoint")),
    responses(
        (status = 200, description = "Newest deliveries first", body = [DeliveryLogEntry]),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such endpoint in this project", body = ErrorBody),
    )
)]
pub async fn list_webhook_deliveries(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(endpoint_id): Path<Uuid>,
) -> Result<Json<Vec<DeliveryLogEntry>>, ApiError> {
    require_endpoint(&state, admin.tenant_id, endpoint_id).await?;
    let deliveries = list_deliveries(&admin.pool, endpoint_id).await?;

    Ok(Json(deliveries))
}
