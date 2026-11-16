use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::auth::user::user_record::{User, user_columns};

pub async fn mark_email_verified(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1 RETURNING ", user_columns!()))
        .bind(user_id)
        .fetch_optional(connection)
        .await
}

/// Opening the reset link proves control of the inbox, so the email also counts as verified.
pub async fn set_password(
    connection: &mut PgConnection,
    user_id: Uuid,
    password_hash: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1",
    )
    .bind(user_id)
    .bind(password_hash)
    .execute(connection)
    .await?;

    Ok(())
}

/// Replaces the password of an account nobody has verified yet, so the latest signup for an
/// email owns it. Returns `None`, changing nothing, when the email is already verified.
pub async fn replace_unverified_password(
    connection: &mut PgConnection,
    user_id: Uuid,
    password_hash: &str,
) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar(
        "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1 AND email_verified_at IS NULL RETURNING id",
    )
    .bind(user_id)
    .bind(password_hash)
    .fetch_optional(connection)
    .await
}

/// Marks an account verified after a provider proved ownership of its email.
///
/// If the local account never verified it, whoever registered it may not own the inbox
/// (pre-account takeover), so their password is discarded before the identity is linked.
/// The caller also ends their sessions.
pub async fn claim_account_for_verified_email(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<User, sqlx::Error> {
    sqlx::query_as(concat!("UPDATE users SET password_hash = CASE WHEN email_verified_at IS NULL THEN NULL ELSE password_hash END, email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1 RETURNING ", user_columns!()))
        .bind(user_id)
        .fetch_one(connection)
        .await
}
