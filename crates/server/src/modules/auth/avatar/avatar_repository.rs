use sqlx::{PgExecutor, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, sqlx::FromRow)]
pub struct StoredAvatar {
    pub image: Vec<u8>,
    pub updated_at: OffsetDateTime,
}

/// Replaces the user's avatar. `None` when the user does not exist (deleted meanwhile).
pub async fn store_avatar<'e>(
    executor: impl PgExecutor<'e>,
    user_id: Uuid,
    image: &[u8],
) -> Result<Option<OffsetDateTime>, sqlx::Error> {
    sqlx::query_scalar(
        "INSERT INTO user_avatars (user_id, image) SELECT id, $2 FROM users WHERE id = $1 \
         ON CONFLICT (user_id) DO UPDATE SET image = EXCLUDED.image, updated_at = now() \
         RETURNING updated_at",
    )
    .bind(user_id)
    .bind(image)
    .fetch_optional(executor)
    .await
}

pub async fn find_avatar(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<StoredAvatar>, sqlx::Error> {
    sqlx::query_as("SELECT image, updated_at FROM user_avatars WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await
}

/// `false` when the user had no photo.
pub async fn delete_avatar<'e>(
    executor: impl PgExecutor<'e>,
    user_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let deleted = sqlx::query("DELETE FROM user_avatars WHERE user_id = $1")
        .bind(user_id)
        .execute(executor)
        .await?;

    Ok(deleted.rows_affected() > 0)
}
