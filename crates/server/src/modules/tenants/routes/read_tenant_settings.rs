use crate::shared::http::api_error::ErrorBody;
use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::access::api_key_tenant::ApiKeyTenant;
use crate::modules::tenants::settings::tenant_settings_repository::{
    TenantSettings, find_tenant_settings,
};
use crate::shared::http::api_error::ApiError;

/// `GET /admin/settings` (secret key only).
#[utoipa::path(
    get,
    path = "/auth/v1/admin/settings",
    tag = "tenant-admin",
    security(("api_key" = [])),
    responses(
        (status = 200, description = "Current settings", body = TenantSettings),
        (status = 403, description = "Requires the secret API key", body = ErrorBody),
    )
)]
pub async fn read_tenant_settings(
    State(state): State<AppState>,
    tenant: ApiKeyTenant,
) -> Result<Json<TenantSettings>, ApiError> {
    tenant.require_secret_key()?;
    let settings = find_tenant_settings(&state.control_plane_pool, tenant.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(settings) = settings else {
        return Err(ApiError::internal(format!(
            "tenant {} not found",
            tenant.tenant_id
        )));
    };

    Ok(Json(settings))
}
