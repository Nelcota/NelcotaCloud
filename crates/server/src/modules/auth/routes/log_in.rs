use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::audit::login_audit::{record_failed_password_login, record_login};
use crate::modules::auth::login::login_completion::LoginResponse;
use crate::modules::auth::login::password_login::{
    PasswordLogin, PasswordLoginServices, log_in_with_password,
};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::login_method::LoginMethod;
use crate::modules::tenants::captcha::captcha_requirement::{CaptchaAnswer, require_captcha};
use crate::modules::tenants::ip_blocks::address_guard::ensure_address_allowed;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;
use crate::shared::rate_limiting::attempt_limiter::Attempt;

#[derive(Deserialize, Validate, ToSchema)]
pub struct LogInBody {
    #[validate(length(min = 1, max = 254))]
    pub email: String,
    #[validate(length(min = 1, max = 128))]
    pub password: String,
    /// Cloudflare Turnstile token; required when the project turned the captcha on.
    #[validate(length(min = 1, max = 4096))]
    pub captcha_token: Option<String>,
}

/// `POST /login`: email and password.
#[utoipa::path(
    post,
    path = "/auth/v1/login",
    tag = "auth",
    security(("api_key" = [])),
    request_body = LogInBody,
    responses(
        (status = 200, description = "Logged in, or the MFA step that must come first", body = LoginResponse),
        (status = 401, description = "Invalid email or password", body = ErrorBody),
        (status = 403, description = "Email not verified yet", body = ErrorBody),
        (status = 429, description = "Too many attempts", body = ErrorBody),
    )
)]
pub async fn log_in(
    State(state): State<AppState>,
    tenant: TenantContext,
    origin: RequestOrigin,
    ValidatedJson(body): ValidatedJson<LogInBody>,
) -> Result<Json<LoginResponse>, ApiError> {
    ensure_address_allowed(&tenant.pool, origin.client_ip).await?;
    let client_ip = origin.client_ip;
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: &body.email,
        client_ip,
    };

    // Checked before hashing, so rejected attempts cost no Argon2 work.
    if let Err(rejected) = state.rate_limits.check_login(&attempt) {
        let error = ApiError::from(rejected);
        let refused = (body.email.as_str(), origin);
        record_failed_password_login(&tenant.pool, &error, refused).await;
        return Err(error);
    }

    let captcha = CaptchaAnswer {
        token: body.captcha_token.as_deref(),
        client_ip,
    };
    require_captcha(&state.captcha_requirement(), tenant.tenant_id, captcha).await?;
    let login = PasswordLogin {
        email: &body.email,
        password: body.password,
    };

    let services = PasswordLoginServices {
        control_plane_pool: &state.control_plane_pool,
        signing: state.token_signing(),
        dummy_password_hash: &state.settings.dummy_password_hash,
    };
    let result = log_in_with_password(&services, &tenant, login).await;

    if let Err(error) = &result {
        let attempt = (body.email.as_str(), origin.clone());
        record_failed_password_login(&tenant.pool, error, attempt).await;
    }

    let response = result?;
    let login = (LoginMethod::Password, origin);
    record_login(&tenant.pool, &response, login).await;

    Ok(Json(response))
}
