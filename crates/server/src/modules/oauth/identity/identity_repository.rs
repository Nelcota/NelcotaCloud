use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::auth::user::user_record::{User, user_columns};

/// A user's account at an external provider (`provider_user_id` is the provider's stable id).
pub struct IdentityKey<'a> {
    pub provider: &'a str,
    pub provider_user_id: &'a str,
}

pub async fn find_identity_user(
    connection: &mut PgConnection,
    key: &IdentityKey<'_>,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        " FROM users WHERE id = (SELECT user_id FROM identities WHERE provider = $1 AND provider_user_id = $2)"
    ))
    .bind(key.provider)
    .bind(key.provider_user_id)
    .fetch_optional(connection)
    .await
}

/// Whether the user already has an account at this provider (with any provider user id).
pub async fn has_provider_identity(
    connection: &mut PgConnection,
    user_id: Uuid,
    provider: &str,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM identities WHERE user_id = $1 AND provider = $2)",
    )
    .bind(user_id)
    .bind(provider)
    .fetch_one(connection)
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
