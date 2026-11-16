use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::mfa::mfa_factor_repository::{delete_mfa_factor, find_mfa_factor};
use crate::modules::auth::mfa::totp_verification::{TotpAttempt, accept_totp_code};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip::ClientIp;
use crate::modules::auth::routes::verify_totp_enrollment::MfaCodeBody;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `DELETE /mfa/totp`: turns TOTP off. A current code is required, so a stolen access token
/// alone cannot remove the second factor.
#[utoipa::path(
    delete,
    path = "/auth/v1/mfa/totp",
    tag = "mfa",
    security(("api_key" = [], "bearer" = [])),
    request_body = MfaCodeBody,
    responses(
        (status = 204, description = "TOTP disabled"),
        (status = 401, description = "Wrong code or invalid access token", body = ErrorBody),
        (status = 404, description = "TOTP is not enabled", body = ErrorBody),
        (status = 429, description = "Too many attempts", body = ErrorBody),
    )
)]
pub async fn disable_totp(
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
    let mut transaction = tenant.pool.begin().await.map_err(ApiError::internal)?;
    let factor = find_mfa_factor(&mut *transaction, claims.sub)
        .await
        .map_err(ApiError::internal)?;
    let Some(factor) = factor.filter(|factor| factor.verified_at.is_some()) else {
        return Err(ApiError::NotFound("enabled authenticator"));
    };
    let totp_attempt = TotpAttempt {
        tenant_id: tenant.tenant_id,
        factor: &factor,
        code: &body.code,
    };
    let accepted = accept_totp_code(&mut transaction, &state.secret_box, totp_attempt)
        .await
        .map_err(ApiError::internal)?;

    if accepted == false {
        return Err(ApiError::InvalidMfaCode);
    }

    delete_mfa_factor(&mut *transaction, claims.sub)
        .await
        .map_err(ApiError::internal)?;
    transaction.commit().await.map_err(ApiError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}
