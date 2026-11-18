use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::captcha::captcha_settings_change::{
    CaptchaSettingsBody, save_captcha,
};
use crate::modules::tenants::captcha::captcha_settings_view::CaptchaSettingsView;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `PUT /admin/captcha`: from now on signup, password login and emailed links need a solved
/// Cloudflare Turnstile widget. The secret is checked with Cloudflare before it is stored.
#[utoipa::path(
    put,
    path = "/auth/v1/admin/captcha",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = CaptchaSettingsBody,
    responses(
        (status = 200, description = "Captcha required from now on", body = CaptchaSettingsView),
        (status = 400, description = "Invalid keys, or a secret Cloudflare does not know", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 503, description = "Cloudflare could not be reached", body = ErrorBody),
    )
)]
pub async fn configure_captcha(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(body): ValidatedJson<CaptchaSettingsBody>,
) -> Result<Json<CaptchaSettingsView>, ApiError> {
    Ok(Json(save_captcha(&state, admin.tenant_id, &body).await?))
}
