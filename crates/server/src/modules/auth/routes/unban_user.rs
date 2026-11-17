use axum::Json;
use axum::extract::Path;
use uuid::Uuid;

use crate::modules::auth::user::user_administration::unban_user as unban;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /admin/users/{user_id}/unban`: the user can log in again.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/users/{user_id}/unban",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 200, description = "User unbanned", body = User),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn unban_user(
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<Json<User>, ApiError> {
    let user = unban(&admin.pool, user_id).await?;
    let Some(user) = user else {
        return Err(ApiError::NotFound("user"));
    };

    Ok(Json(user))
}
