use axum::http::StatusCode;

use crate::modules::auth::avatar::avatar_repository::delete_avatar;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /user/avatar`: removes the profile photo; succeeds when there was none.
#[utoipa::path(
    delete,
    path = "/auth/v1/user/avatar",
    tag = "auth",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 204, description = "Photo removed"),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
    )
)]
pub async fn remove_avatar(authenticated: AuthenticatedUser) -> Result<StatusCode, ApiError> {
    let tenant = &authenticated.tenant;
    delete_avatar(&tenant.pool, authenticated.claims.sub).await?;

    Ok(StatusCode::NO_CONTENT)
}
