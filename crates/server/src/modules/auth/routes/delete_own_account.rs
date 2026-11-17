use axum::http::StatusCode;

use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::user::user_administration::delete_user;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /user`: the logged-in user deletes their own account and all its data (the right
/// to erasure). Their access token stops working once it no longer matches a user.
#[utoipa::path(
    delete,
    path = "/auth/v1/user",
    tag = "auth",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 204, description = "Account deleted"),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
    )
)]
pub async fn delete_own_account(authenticated: AuthenticatedUser) -> Result<StatusCode, ApiError> {
    let tenant = &authenticated.tenant;
    let deleted = delete_user(&tenant.pool, authenticated.claims.sub).await?;

    if deleted == false {
        return Err(ApiError::from(TenantsRejection::InvalidAccessToken));
    }

    Ok(StatusCode::NO_CONTENT)
}
