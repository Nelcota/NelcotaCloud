use axum::Json;

use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::session::session_listing::{SessionSummary, list_active_sessions};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /sessions`: where the logged-in user is logged in, most recently used first.
#[utoipa::path(
    get,
    path = "/auth/v1/sessions",
    tag = "sessions",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 200, description = "Active sessions", body = Vec<SessionSummary>),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
    )
)]
pub async fn list_sessions(
    authenticated: AuthenticatedUser,
) -> Result<Json<Vec<SessionSummary>>, ApiError> {
    let tenant = &authenticated.tenant;
    let claims = &authenticated.claims;
    let mut sessions = list_active_sessions(&tenant.pool, claims.sub)
        .await
        .map_err(ApiError::internal)?;

    for session in &mut sessions {
        session.is_current = session.id == claims.sid;
    }

    Ok(Json(sessions))
}
