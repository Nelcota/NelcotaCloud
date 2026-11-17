use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::mfa::factor_code_requirement::{FactorCodeRequest, disable_factor};
use crate::modules::auth::routes::mfa_code_body::MfaCodeBody;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;
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
    let request = FactorCodeRequest {
        authenticated: &authenticated,
        code: &body.code,
        client_ip,
    };
    disable_factor(&state, &request).await?;

    Ok(StatusCode::NO_CONTENT)
}
