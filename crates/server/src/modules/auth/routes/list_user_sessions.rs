use axum::Json;
use axum::extract::Path;
use uuid::Uuid;

use crate::modules::auth::session::user_sessions::{UserSessions, load_user_sessions};
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/users/{user_id}/sessions`: the user's active sessions and last login.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/users/{user_id}/sessions",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 200, description = "The user's sessions", body = UserSessions),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn list_user_sessions(
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserSessions>, ApiError> {
    let sessions = load_user_sessions(&admin.pool, user_id).await?;
    let sessions = sessions.ok_or(ApiError::NotFound("user"))?;

    Ok(Json(sessions))
}
