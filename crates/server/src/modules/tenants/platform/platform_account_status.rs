use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

/// What every console request checks about the account behind its token, read from the
/// platform tenant's own users.
#[derive(sqlx::FromRow)]
pub struct PlatformAccountStatus {
    pub email: String,
    pub email_verified_at: Option<OffsetDateTime>,
    pub banned_at: Option<OffsetDateTime>,
}

pub async fn find_platform_account_status(
    platform_pool: &PgPool,
    account_id: Uuid,
) -> Result<Option<PlatformAccountStatus>, sqlx::Error> {
    sqlx::query_as("SELECT email, email_verified_at, banned_at FROM users WHERE id = $1")
        .bind(account_id)
        .fetch_optional(platform_pool)
        .await
}
