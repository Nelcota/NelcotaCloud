use axum::Json;
use axum::extract::Path;
use uuid::Uuid;

use crate::modules::auth::user::user_administration::ban_user as ban;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /admin/users/{user_id}/ban`: no more logins or refreshes, and every session ends.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/users/{user_id}/ban",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 200, description = "User banned", body = User),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn ban_user(
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<Json<User>, ApiError> {
    let user = ban(&admin.pool, user_id).await?;
    let Some(user) = user else {
        return Err(ApiError::NotFound("user"));
    };

    Ok(Json(user))
}
