use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::modules::tenants::settings::tenant_settings_repository::{
    TenantSettings, TenantSettingsChange, update_tenant_settings,
};
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct TenantSettingsBody {
    #[validate(length(min = 1, max = 100))]
    pub name: Option<String>,
    #[validate(length(min = 1, max = 2048))]
    pub site_url: Option<String>,
    pub require_email_verification: Option<bool>,
}

/// `PATCH /admin/settings` (secret key only): changes only the fields that are sent.
pub async fn change_tenant_settings(
    State(state): State<AppState>,
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<TenantSettingsBody>,
) -> Result<Json<TenantSettings>, ApiError> {
    tenant.require_secret_key()?;
    let name = body.name.as_deref().map(str::trim);

    if name.is_some_and(str::is_empty) {
        return Err(ApiError::InvalidRequest(
            "name must not be blank".to_owned(),
        ));
    }

    let site_url = parse_site_url(body.site_url.as_deref())?;
    let change = TenantSettingsChange {
        name,
        site_url: site_url.as_ref(),
        require_email_verification: body.require_email_verification,
    };
    let settings = update_tenant_settings(&state.control_plane_pool, tenant.tenant_id, change)
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

fn parse_site_url(raw_site_url: Option<&str>) -> Result<Option<SiteUrl>, ApiError> {
    raw_site_url
        .map(SiteUrl::parse)
        .transpose()
        .map_err(ApiError::invalid_request)
}
