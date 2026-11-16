use crate::shared::http::api_error::ErrorBody;
use axum::Json;

use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::auth::user::user_record::User;
use crate::shared::http::api_error::ApiError;

#[utoipa::path(
    get,
    path = "/auth/v1/user",
    tag = "auth",
    security(("api_key" = [], "bearer" = [])),
    responses(
        (status = 200, description = "The logged-in user", body = User),
        (status = 401, description = "Missing or invalid access token", body = ErrorBody),
    )
)]
pub async fn current_user(authenticated: AuthenticatedUser) -> Result<Json<User>, ApiError> {
    let tenant = &authenticated.tenant;
    let claims = &authenticated.claims;
    let user = find_user_by_id(&tenant.pool, claims.sub)
        .await
        .map_err(ApiError::internal)?;
    // A deleted user's token can still be unexpired; treat it as invalid.
    let Some(user) = user else {
        return Err(ApiError::InvalidAccessToken);
    };

    if user.banned_at.is_some() {
        return Err(ApiError::UserBanned);
    }

    Ok(Json(user))
}
