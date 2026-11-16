use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::mfa::mfa_factor_repository::find_mfa_factor;
use crate::modules::auth::mfa::totp_verification::{TotpAttempt, accept_totp_code};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct MfaCodeBody {
    /// The 6-digit code shown by the authenticator app.
    #[validate(length(min = 6, max = 10))]
    pub code: String,
}

/// `POST /mfa/totp/verify`: the first code turns the pending authenticator on.
#[utoipa::path(
    post,
    path = "/auth/v1/mfa/totp/verify",
    tag = "mfa",
    security(("api_key" = [], "bearer" = [])),
    request_body = MfaCodeBody,
    responses(
        (status = 204, description = "TOTP enabled; logins now ask for a code"),
        (status = 401, description = "Wrong code or invalid access token", body = ErrorBody),
        (status = 404, description = "No pending authenticator", body = ErrorBody),
        (status = 429, description = "Too many attempts", body = ErrorBody),
    )
)]
pub async fn verify_totp_enrollment(
    State(state): State<AppState>,
    authenticated: AuthenticatedUser,
    ClientIp(client_ip): ClientIp,
    ValidatedJson(body): ValidatedJson<MfaCodeBody>,
) -> Result<StatusCode, ApiError> {
    let tenant = &authenticated.tenant;
    let claims = &authenticated.claims;
    let attempt = Attempt {
        tenant_id: tenant.tenant_id,
        email: &claims.email,
        client_ip,
    };
    state
        .rate_limits
        .mfa
        .check(&attempt)
        .map_err(|_| ApiError::RateLimited)?;
    let mut connection = tenant.pool.acquire().await.map_err(ApiError::internal)?;
    let factor = find_mfa_factor(&mut *connection, claims.sub)
        .await
        .map_err(ApiError::internal)?;
    let Some(factor) = factor.filter(|factor| factor.verified_at.is_none()) else {
        return Err(ApiError::NotFound("pending authenticator"));
    };
    let totp_attempt = TotpAttempt {
        tenant_id: tenant.tenant_id,
        factor: &factor,
        code: &body.code,
    };
    let accepted = accept_totp_code(&mut connection, &state.secret_box, totp_attempt)
        .await
        .map_err(ApiError::internal)?;

    if accepted == false {
        return Err(ApiError::InvalidMfaCode);
    }

    Ok(StatusCode::NO_CONTENT)
}
