use axum::Json;
use axum::extract::State;
use serde::Serialize;
use utoipa::ToSchema;

use crate::app_state::AppState;
use crate::modules::oauth::login::redirects::registered_redirects;
use crate::modules::oauth::provider::configured_provider::{
    ConfiguredProvider, list_configured_providers,
};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Serialize, ToSchema)]
pub struct ConfiguredProviders {
    pub providers: Vec<ConfiguredProvider>,
    /// The server callback to register at Google or GitHub.
    pub callback_url: String,
    /// The exact callbacks registered for the project's app.
    pub redirect_urls: Vec<String>,
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
    let providers = list_configured_providers(&state.control_plane_pool, admin.tenant_id).await?;
    let redirect_urls = registered_redirects(&state.control_plane_pool, admin.tenant_id).await?;

    Ok(Json(ConfiguredProviders {
        providers,
        callback_url: state.settings.oauth_callback_url.clone(),
        redirect_urls,
    }))
}
