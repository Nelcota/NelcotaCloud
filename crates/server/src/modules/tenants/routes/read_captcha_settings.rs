use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::captcha::captcha_settings_repository::find_captcha_settings;
use crate::modules::tenants::captcha::captcha_settings_view::CaptchaSettingsView;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/captcha`: whether the project asks for a captcha; the secret is never returned.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/captcha",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Current captcha settings", body = CaptchaSettingsView),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_captcha_settings(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<CaptchaSettingsView>, ApiError> {
    let stored = find_captcha_settings(&state.control_plane_pool, admin.tenant_id).await?;

    Ok(Json(CaptchaSettingsView {
        site_key: stored.map(|settings| settings.site_key),
    }))
}
