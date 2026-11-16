use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::auth::email_address::EmailAddress;
use crate::auth::user_repository::{InsertUserError, USER_COLUMNS, User, map_unique_violation};

pub async fn mark_email_verified(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<User>, sqlx::Error> {
    let query = format!(
        "UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1 RETURNING {USER_COLUMNS}"
    );

    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(user_id)
        .fetch_optional(pool)
        .await
}

/// Opening the reset link proves control of the inbox, so the email also counts as verified.
pub async fn set_password(
    pool: &PgPool,
    user_id: Uuid,
    password_hash: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1",
    )
    .bind(user_id)
    .bind(password_hash)
    .execute(pool)
    .await?;

    Ok(())
}

/// Users created through OAuth have no password until they set one via password reset.
pub async fn insert_oauth_user(
    connection: &mut PgConnection,
    email: &EmailAddress,
) -> Result<User, InsertUserError> {
    let query = format!(
        "INSERT INTO users (id, email, email_verified_at) VALUES ($1, $2, now()) RETURNING {USER_COLUMNS}"
    );
    let insertion = sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(Uuid::new_v4())
        .bind(email.as_str())
        .fetch_one(connection)
        .await;

    insertion.map_err(map_unique_violation)
}

/// A provider just proved ownership of this email. If the local account never verified it,
/// whoever registered it may not own the inbox (pre-account takeover), so their password is
/// discarded before the identity is linked.
pub async fn claim_account_for_verified_email(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<User, sqlx::Error> {
    let query = format!(
        "UPDATE users SET password_hash = CASE WHEN email_verified_at IS NULL THEN NULL ELSE password_hash END, email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1 RETURNING {USER_COLUMNS}"
    );

    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(user_id)
        .fetch_one(connection)
        .await
}
