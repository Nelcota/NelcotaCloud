use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::mfa::factor_code_requirement::{FactorCodeRequest, activate_factor};
use crate::modules::auth::routes::mfa_code_body::MfaCodeBody;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;
use crate::shared::http::validated_json::ValidatedJson;

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
    let request = FactorCodeRequest {
        authenticated: &authenticated,
        code: &body.code,
        client_ip,
    };
    activate_factor(&state, &request).await?;

    Ok(StatusCode::NO_CONTENT)
}
