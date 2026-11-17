use axum::extract::Path;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::session::session_listing::end_session_of_user;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /sessions/{session_id}`: logs one device out; its access token expires on its own.
#[utoipa::path(
    delete,
    path = "/auth/v1/sessions/{session_id}",
    tag = "sessions",
    security(("api_key" = [], "bearer" = [])),
    params(("session_id" = Uuid, Path, description = "Id of the session")),
    responses(
        (status = 204, description = "Session ended"),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
        (status = 404, description = "No such session of this user", body = ErrorBody),
    )
)]
pub async fn end_session(
    authenticated: AuthenticatedUser,
    Path(session_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let tenant = &authenticated.tenant;
    let ended = end_session_of_user(&tenant.pool, authenticated.claims.sub, session_id).await?;

    if ended == false {
        return Err(ApiError::NotFound("session"));
    }

    Ok(StatusCode::NO_CONTENT)
}
