use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::audit::login_audit::{record_failed_password_login, record_login};
use crate::modules::auth::audit::login_method::LoginMethod;
use crate::modules::auth::login::login_completion::LoginResponse;
use crate::modules::auth::login::password_login::{PasswordLogin, log_in_with_password};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct LogInBody {
    #[validate(length(min = 1, max = 254))]
    pub email: String,
    #[validate(length(min = 1, max = 128))]
    pub password: String,
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
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<LogInBody>,
) -> Result<Json<LoginResponse>, ApiError> {
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: &body.email,
        client_ip,
    };
    // Checked before hashing, so rejected attempts cost no Argon2 work.
    state.rate_limits.check_login(&attempt)?;
    let login = PasswordLogin {
        email: &body.email,
        password: body.password,
    };

    let result = log_in_with_password(&state, &tenant, login).await;

    if let Err(error) = &result {
        let attempt = (body.email.as_str(), client_ip);
        record_failed_password_login(&tenant.pool, error, attempt).await;
    }

    let response = result?;
    let login = (LoginMethod::Password, client_ip);
    record_login(&tenant.pool, &response, login).await;

    Ok(Json(response))
}
