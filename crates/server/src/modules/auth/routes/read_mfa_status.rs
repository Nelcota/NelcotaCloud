use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

use crate::modules::auth::mfa::mfa_factor_repository::find_mfa_factor;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Serialize, ToSchema)]
pub struct MfaStatus {
    /// Logins ask for a TOTP code.
    pub totp_enabled: bool,
    /// An authenticator was added but its first code was not verified yet.
    pub totp_pending: bool,
}

/// `GET /mfa`: the second factors of the logged-in user.
#[utoipa::path(
    get,
    path = "/auth/v1/mfa",
    tag = "mfa",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 200, description = "MFA status", body = MfaStatus),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
    )
)]
pub async fn read_mfa_status(
    authenticated: AuthenticatedUser,
) -> Result<Json<MfaStatus>, ApiError> {
    let tenant = &authenticated.tenant;
    let factor = find_mfa_factor(&tenant.pool, authenticated.claims.sub).await?;
    let verified_at = factor.as_ref().map(|factor| factor.verified_at);
    let status = MfaStatus {
        totp_enabled: matches!(verified_at, Some(Some(_))),
        totp_pending: matches!(verified_at, Some(None)),
    };

    Ok(Json(status))
}
