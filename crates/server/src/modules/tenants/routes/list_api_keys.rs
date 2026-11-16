use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::api_keys::api_key_repository::list_api_keys as find_api_keys;
use crate::modules::tenants::api_keys::api_key_summary::ApiKeySummary;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/api-keys`: every key of the tenant, newest first, without the keys themselves.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/api-keys",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "The tenant's API keys", body = Vec<ApiKeySummary>),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_api_keys(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<Vec<ApiKeySummary>>, ApiError> {
    let keys = find_api_keys(&state.control_plane_pool, admin.tenant_id)
        .await
        .map_err(ApiError::internal)?;

    Ok(Json(keys))
}
