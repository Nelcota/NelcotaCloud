use sqlx::PgConnection;
use uuid::Uuid;

use crate::auth::user_repository::User;

/// A user's account at an external provider (`provider_user_id` is the provider's stable id).
pub struct IdentityKey<'a> {
    pub provider: &'a str,
    pub provider_user_id: &'a str,
}

pub async fn find_identity_user(
    connection: &mut PgConnection,
    key: &IdentityKey<'_>,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(
        "SELECT users.id, users.email, users.email_verified_at, users.created_at FROM identities JOIN users ON users.id = identities.user_id WHERE identities.provider = $1 AND identities.provider_user_id = $2",
    )
        .bind(key.provider)
        .bind(key.provider_user_id)
        .fetch_optional(connection)
        .await
}

pub async fn insert_identity(
    connection: &mut PgConnection,
    user_id: Uuid,
    key: &IdentityKey<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO identities (id, user_id, provider, provider_user_id) VALUES ($1, $2, $3, $4)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(key.provider)
    .bind(key.provider_user_id)
    .execute(connection)
    .await?;

    Ok(())
}
