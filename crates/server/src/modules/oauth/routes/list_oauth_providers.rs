use axum::Json;
use axum::extract::State;
use serde::Serialize;
use utoipa::ToSchema;

use crate::app_state::AppState;
use crate::modules::oauth::provider::configured_provider::{
    ConfiguredProvider, list_configured_providers,
};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Serialize, ToSchema)]
pub struct ConfiguredProviders {
    pub providers: Vec<ConfiguredProvider>,
}

/// `GET /admin/oauth`: the providers the tenant has its own OAuth app for, without secrets.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/oauth",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Configured providers", body = ConfiguredProviders),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_oauth_providers(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<ConfiguredProviders>, ApiError> {
    let providers = list_configured_providers(&state.control_plane_pool, admin.tenant_id)
        .await
        .map_err(ApiError::internal)?;

    Ok(Json(ConfiguredProviders { providers }))
}
