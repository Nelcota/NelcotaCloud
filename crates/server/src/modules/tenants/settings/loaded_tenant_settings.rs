use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::modules::tenants::settings::tenant_settings_repository::find_tenant_settings;
use crate::shared::http::api_error::ApiError;

/// Tenant settings with the site URL already validated.
pub struct LoadedTenantSettings {
    pub name: String,
    /// `None` for tenants created before the site URL became required.
    pub site_url: Option<SiteUrl>,
    pub require_email_verification: bool,
}

pub async fn load_tenant_settings(
    state: &AppState,
    tenant_id: Uuid,
) -> Result<LoadedTenantSettings, ApiError> {
    let settings = find_tenant_settings(&state.control_plane_pool, tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(settings) = settings else {
        return Err(ApiError::internal(format!("tenant {tenant_id} not found")));
    };
    let site_url = settings
        .site_url
        .as_deref()
        .map(SiteUrl::parse)
        .transpose()
        .map_err(ApiError::internal)?;

    Ok(LoadedTenantSettings {
        name: settings.name,
        site_url,
        require_email_verification: settings.require_email_verification,
    })
}
