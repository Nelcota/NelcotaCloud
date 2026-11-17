use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::admin_access::AdminAccess;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/v1/tenants/{tenant_id}`: deletes the tenant, its users and its database.
#[utoipa::path(
    delete,
    path = "/admin/v1/tenants/{tenant_id}",
    tag = "platform-admin",
    security(("admin_token" = [])),
    params(("tenant_id" = Uuid, Path, description = "Id of the tenant")),
    responses(
        (status = 204, description = "Tenant deleted"),
        (status = 401, description = "Missing or wrong admin token", body = ErrorBody),
        (status = 404, description = "No such tenant", body = ErrorBody),
    )
)]
pub async fn delete_tenant(
    _admin: AdminAccess,
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let removed = state
        .tenant_removal()
        .remove_tenant(tenant_id)
        .await
        .map_err(ApiError::internal)?;

    if removed == false {
        return Err(ApiError::NotFound("tenant"));
    }

    Ok(StatusCode::NO_CONTENT)
}
