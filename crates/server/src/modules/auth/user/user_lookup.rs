use sqlx::{PgConnection, PgExecutor, PgPool};
use uuid::Uuid;

use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_record::{User, UserCredentials, user_columns};

pub async fn find_credentials_by_email(
    pool: &PgPool,
    email: &EmailAddress,
) -> Result<Option<UserCredentials>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        ", password_hash FROM users WHERE email = $1"
    ))
    .bind(email.as_str())
    .fetch_optional(pool)
    .await
}

pub async fn find_user_by_email<'e>(
    executor: impl PgExecutor<'e>,
    email: &EmailAddress,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        " FROM users WHERE email = $1"
    ))
    .bind(email.as_str())
    .fetch_optional(executor)
    .await
}

pub async fn find_user_by_id<'e>(
    executor: impl PgExecutor<'e>,
    user_id: Uuid,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        " FROM users WHERE id = $1"
    ))
    .bind(user_id)
    .fetch_optional(executor)
    .await
}

/// What the password lock found.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PasswordLock {
    /// Locked, with the password still the one that was checked.
    Locked,
    /// A reset or OAuth claim changed the password since it was checked.
    Changed,
    /// Banned since the password was checked.
    Banned,
}

/// Locks the user's row until the transaction ends, if `password_hash` is still its password.
///
/// A password reset or OAuth claim committed meanwhile makes this `Changed`, a ban `Banned`
/// (read under the lock, so it is never stale); one that runs later waits for the lock and then
/// sees (and revokes) the session created under it.
pub async fn lock_if_password_unchanged(
    connection: &mut PgConnection,
    user_id: Uuid,
    password_hash: &str,
) -> Result<PasswordLock, sqlx::Error> {
    let locked: Option<bool> = sqlx::query_scalar(
        "SELECT banned_at IS NOT NULL FROM users WHERE id = $1 AND password_hash = $2 FOR SHARE",
    )
    .bind(user_id)
    .bind(password_hash)
    .fetch_optional(connection)
    .await?;

    Ok(match locked {
        None => PasswordLock::Changed,
        Some(true) => PasswordLock::Banned,
        Some(false) => PasswordLock::Locked,
    })
}
