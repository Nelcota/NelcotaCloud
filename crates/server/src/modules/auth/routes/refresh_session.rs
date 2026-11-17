use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::auth::routes::refresh_token_body::RefreshTokenBody;
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::session::session_renewal::renew_session;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /refresh`: rotates the refresh token. The presented token is consumed first, so a
/// refused refresh (e.g. email verification now required) also ends that session.
#[utoipa::path(
    post,
    path = "/auth/v1/refresh",
    tag = "auth",
    security(("api_key" = [])),
    request_body = RefreshTokenBody,
    responses(
        (status = 200, description = "New tokens; the refresh token sent is no longer valid", body = SessionTokens),
        (status = 401, description = "Invalid, expired, reused or revoked refresh token", body = ErrorBody),
        (status = 403, description = "Email not verified yet", body = ErrorBody),
    )
)]
pub async fn refresh_session(
    State(state): State<AppState>,
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<RefreshTokenBody>,
) -> Result<Json<SessionTokens>, ApiError> {
    Ok(Json(
        renew_session(&state, &tenant, &body.refresh_token).await?,
    ))
}
