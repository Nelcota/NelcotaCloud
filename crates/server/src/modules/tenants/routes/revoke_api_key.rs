use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde_json::json;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::api_keys::api_key_revocation::{
    ApiKeyRevocationError, revoke_api_key as revoke,
};
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/api-keys/{key_id}`: the key stops working at once.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/api-keys/{key_id}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("key_id" = Uuid, Path, description = "Id of the key to revoke")),
    responses(
        (status = 204, description = "Key revoked"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No active key with this id", body = ErrorBody),
        (status = 409, description = "It is the last active secret key", body = ErrorBody),
    )
)]
pub async fn revoke_api_key(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(key_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let revocation = revoke(&state.control_plane_pool, admin.tenant_id, key_id).await;
    match revocation {
        Ok(()) => {
            let change = ProjectChange {
                tenant_id: admin.tenant_id,
                author: admin.author(),
                action: AuditAction::ApiKeyRevoked,
                details: json!({ "key_id": key_id }),
            };
            record_project_change(&state.tenant_pools, change).await;
            Ok(StatusCode::NO_CONTENT)
        }
        Err(ApiKeyRevocationError::NotFound) => Err(ApiError::NotFound("API key")),
        Err(error @ ApiKeyRevocationError::LastSecretKey) => {
            Err(ApiError::Conflict(error.to_string()))
        }
        Err(other) => Err(ApiError::internal(other)),
    }
}
