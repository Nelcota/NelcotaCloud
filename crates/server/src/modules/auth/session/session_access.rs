use sqlx::PgExecutor;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

#[derive(sqlx::FromRow)]
pub(crate) struct SessionAccount {
    pub email: String,
    pub email_verified_at: Option<OffsetDateTime>,
    banned: bool,
    active: bool,
}

/// Confirms that a signed token still belongs to an active session.
pub(crate) async fn require_active_session<'e>(
    executor: impl PgExecutor<'e>,
    user_id: Uuid,
    family_id: Uuid,
) -> Result<SessionAccount, ApiError> {
    let status: Option<SessionAccount> = sqlx::query_as(
        "SELECT email, email_verified_at, banned_at IS NOT NULL AS banned, EXISTS (
             SELECT FROM refresh_tokens AS token
             WHERE token.user_id = users.id AND token.family_id = $2
             AND token.revoked_at IS NULL AND token.expires_at > clock_timestamp()
             AND (users.sessions_invalidated_at IS NULL OR token.family_started_at > users.sessions_invalidated_at)
             AND NOT EXISTS (SELECT FROM revoked_token_families WHERE family_id = $2)
         ) AS active FROM users WHERE id = $1",
    )
    .bind(user_id)
    .bind(family_id)
    .fetch_optional(executor)
    .await?;

    match status {
        Some(account) if account.banned => Err(TenantsRejection::UserBanned.into()),
        Some(account) if account.active => Ok(account),
        _ => Err(TenantsRejection::InvalidAccessToken.into()),
    }
}
