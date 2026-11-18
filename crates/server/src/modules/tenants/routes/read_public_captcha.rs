use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::access::api_key_tenant::ApiKeyTenant;
use crate::modules::tenants::captcha::captcha_settings_repository::find_captcha_settings;
use crate::modules::tenants::captcha::captcha_settings_view::CaptchaSettingsView;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /captcha`: for apps, whether to render the Turnstile widget and with which site key.
#[utoipa::path(
    get,
    path = "/auth/v1/captcha",
    tag = "auth",
    security(("api_key" = [])),
    responses(
        (status = 200, description = "The site key, or `null` when no captcha is needed", body = CaptchaSettingsView),
        (status = 401, description = "Missing or invalid API key", body = ErrorBody),
    )
)]
pub async fn read_public_captcha(
    State(state): State<AppState>,
    tenant: ApiKeyTenant,
) -> Result<Json<CaptchaSettingsView>, ApiError> {
    let stored = find_captcha_settings(&state.control_plane_pool, tenant.tenant_id).await?;

    Ok(Json(CaptchaSettingsView {
        site_key: stored.map(|settings| settings.site_key),
    }))
}
