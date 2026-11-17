use axum::extract::Path;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::modules::auth::user::user_administration::delete_user as delete;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/users/{user_id}`: removes the user with their identities and sessions.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/users/{user_id}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 204, description = "User deleted"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn delete_user(
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let deleted = delete(&admin.pool, user_id).await?;

    if deleted == false {
        return Err(ApiError::NotFound("user"));
    }

    Ok(StatusCode::NO_CONTENT)
}
