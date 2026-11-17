use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::settings::tenant_settings::TenantSettings;
use crate::modules::tenants::settings::tenant_settings_update::{
    TenantSettingsUpdate, update_settings,
};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct TenantSettingsBody {
    #[validate(length(min = 1, max = 100))]
    pub name: Option<String>,
    #[validate(length(min = 1, max = 2048))]
    pub site_url: Option<String>,
    pub require_email_verification: Option<bool>,
}

/// `PATCH /admin/settings` (secret key only): changes only the fields that are sent.
#[utoipa::path(
    patch,
    path = "/auth/v1/admin/settings",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = TenantSettingsBody,
    responses(
        (status = 200, description = "Updated settings", body = TenantSettings),
        (status = 400, description = "Invalid name or site URL", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn change_tenant_settings(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(body): ValidatedJson<TenantSettingsBody>,
) -> Result<Json<TenantSettings>, ApiError> {
    let update = TenantSettingsUpdate {
        name: body.name.as_deref(),
        site_url: body.site_url.as_deref(),
        require_email_verification: body.require_email_verification,
    };
    let pool = &state.control_plane_pool;

    Ok(Json(update_settings(pool, admin.tenant_id, update).await?))
}
