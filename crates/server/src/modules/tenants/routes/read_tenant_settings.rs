use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::settings::tenant_settings::TenantSettings;
use crate::modules::tenants::settings::tenant_settings_repository::find_tenant_settings;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/settings` (secret key only).
#[utoipa::path(
    get,
    path = "/auth/v1/admin/settings",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Current settings", body = TenantSettings),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_tenant_settings(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<TenantSettings>, ApiError> {
    let settings = find_tenant_settings(&state.control_plane_pool, admin.tenant_id).await?;
    let Some(settings) = settings else {
        return Err(ApiError::internal(format!(
            "tenant {} not found",
            admin.tenant_id
        )));
    };

    Ok(Json(settings))
}
