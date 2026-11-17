use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::modules::tenants::settings::tenant_settings_repository::find_tenant_settings;
use crate::shared::http::api_error::ApiError;

/// Tenant settings with the site URL already validated.
pub struct LoadedTenantSettings {
    pub name: String,
    pub site_url: SiteUrl,
    pub require_email_verification: bool,
}

pub async fn load_tenant_settings(
    control_plane_pool: &PgPool,
    tenant_id: Uuid,
) -> Result<LoadedTenantSettings, ApiError> {
    let settings = find_tenant_settings(control_plane_pool, tenant_id).await?;
    let Some(settings) = settings else {
        return Err(ApiError::internal(format!("tenant {tenant_id} not found")));
    };
    let site_url = SiteUrl::parse(&settings.site_url).map_err(ApiError::internal)?;

    Ok(LoadedTenantSettings {
        name: settings.name,
        site_url,
        require_email_verification: settings.require_email_verification,
    })
}
