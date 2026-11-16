use axum::Json;

use crate::auth::user_repository::{User, find_user_by_id};
use crate::http::api_error::ApiError;
use crate::http::authenticated_user::AuthenticatedUser;

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

    Ok(Json(user))
}
