use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::session::session_listing::end_other_sessions as end_others;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /sessions`: logs out every other device, keeping the session of this request.
#[utoipa::path(
    delete,
    path = "/auth/v1/sessions",
    tag = "sessions",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 204, description = "Other sessions ended"),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
    )
)]
pub async fn end_other_sessions(
    State(state): State<AppState>,
    authenticated: AuthenticatedUser,
) -> Result<StatusCode, ApiError> {
    let tenant = &authenticated.tenant;
    let claims = &authenticated.claims;
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    end_others(&tenant.pool, (claims.sub, claims.sid), &webhooks).await?;

    Ok(StatusCode::NO_CONTENT)
}
