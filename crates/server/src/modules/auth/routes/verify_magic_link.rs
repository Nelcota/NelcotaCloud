use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::auth::login::login_completion::LoginResponse;
use crate::modules::auth::login::magic_link_redemption::redeem_magic_link;
use crate::modules::auth::routes::one_time_token_body::OneTimeTokenBody;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /magic-link/verify`: trades the token from the emailed link for a session.
///
/// Opening the link proves control of the inbox. On an account nobody verified, whoever set
/// its password may not own the email, so its password, sessions and authenticator go.
#[utoipa::path(
    post,
    path = "/auth/v1/magic-link/verify",
    tag = "auth",
    security(("api_key" = [])),
    request_body = OneTimeTokenBody,
    responses(
        (status = 200, description = "Logged in, or the MFA step that must come first", body = LoginResponse),
        (status = 400, description = "Invalid, used or expired link", body = ErrorBody),
        (status = 403, description = "The user is banned", body = ErrorBody),
    )
)]
pub async fn verify_magic_link(
    State(state): State<AppState>,
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<OneTimeTokenBody>,
) -> Result<Json<LoginResponse>, ApiError> {
    Ok(Json(redeem_magic_link(&state, &tenant, &body.token).await?))
}
