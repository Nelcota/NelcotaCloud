use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::modules::tenants::settings::tenant_settings::TenantSettings;
use crate::modules::tenants::settings::tenant_settings_repository::{
    TenantSettingsChange, update_tenant_settings,
};
use crate::shared::http::api_error::ApiError;

/// Settings as the owner sent them; `None` keeps the current value.
pub struct TenantSettingsUpdate<'a> {
    pub name: Option<&'a str>,
    pub site_url: Option<&'a str>,
    pub require_email_verification: Option<bool>,
    pub mascot_id: Option<i16>,
}

/// Validates the sent fields and stores them, returning the settings now in effect.
pub async fn update_settings(
    control_plane_pool: &PgPool,
    tenant_id: Uuid,
    update: TenantSettingsUpdate<'_>,
) -> Result<TenantSettings, ApiError> {
    let name = valid_name(update.name)?;
    let site_url = update.site_url.map(SiteUrl::parse).transpose();
    let site_url = site_url.map_err(ApiError::invalid_request)?;
    let change = TenantSettingsChange {
        name,
        site_url: site_url.as_ref(),
        require_email_verification: update.require_email_verification,
        mascot_id: update.mascot_id,
    };
    let settings = update_tenant_settings(control_plane_pool, tenant_id, change).await?;
    let settings =
        settings.ok_or_else(|| ApiError::internal(format!("tenant {tenant_id} not found")))?;

    Ok(settings)
}

/// The length check accepts whitespace-only names, which would be stored blank.
fn valid_name(raw_name: Option<&str>) -> Result<Option<&str>, ApiError> {
    let name = raw_name.map(str::trim);

    if name.is_some_and(str::is_empty) {
        return Err(ApiError::InvalidRequest(
            "name must not be blank".to_owned(),
        ));
    }

    Ok(name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_names_and_refuses_blank_ones() {
        assert_eq!(valid_name(Some("  Acme ")).ok(), Some(Some("Acme")));
        assert_eq!(valid_name(None).ok(), Some(None));
        assert!(valid_name(Some("   ")).is_err());
    }
}
