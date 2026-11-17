use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::email::admin_verification_resend::{
    VerificationResend, resend_verification_email,
};
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;

/// `POST /admin/users/{user_id}/verification-email`: emails a new verification link to an
/// unverified user, under the same per-address limit as the public resend.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/users/{user_id}/verification-email",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 202, description = "A new verification link is being sent"),
        (status = 403, description = "Requires the secret API key, or membership in the project; or the user is banned", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
        (status = 409, description = "The email is already verified", body = ErrorBody),
        (status = 429, description = "Too many emails requested", body = ErrorBody),
    )
)]
pub async fn resend_user_verification(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    ClientIp(client_ip): ClientIp,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let resend = VerificationResend { user_id, client_ip };
    resend_verification_email(&state, admin, &resend).await?;

    Ok(StatusCode::ACCEPTED)
}
