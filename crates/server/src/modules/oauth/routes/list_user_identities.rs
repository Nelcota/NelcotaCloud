use axum::Json;
use axum::extract::Path;
use uuid::Uuid;

use crate::modules::oauth::identity::user_identities::{
    UserIdentities, list_user_identities as find_identities,
};
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/users/{user_id}/identities`: the social logins linked to the user.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/users/{user_id}/identities",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("user_id" = Uuid, Path, description = "Id of the user")),
    responses(
        (status = 200, description = "Linked identities, oldest first", body = UserIdentities),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such user", body = ErrorBody),
    )
)]
pub async fn list_user_identities(
    admin: TenantAdminContext,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserIdentities>, ApiError> {
    let identities = find_identities(&admin.pool, user_id).await?;
    let Some(identities) = identities else {
        return Err(ApiError::NotFound("user"));
    };

    Ok(Json(identities))
}
