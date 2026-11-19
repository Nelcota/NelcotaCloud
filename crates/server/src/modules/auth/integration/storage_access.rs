use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

pub(crate) async fn require_active_user(pool: &PgPool, user_id: Uuid) -> Result<(), ApiError> {
    let user = find_user_by_id(pool, user_id)
        .await?
        .ok_or(TenantsRejection::InvalidAccessToken)?;

    if user.banned_at.is_some() {
        return Err(TenantsRejection::UserBanned.into());
    }

    Ok(())
}
