use sqlx::PgConnection;
use sqlx::error::DatabaseError;
use uuid::Uuid;

use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_record::{User, user_columns};

#[derive(Debug, thiserror::Error)]
pub enum InsertUserError {
    #[error("email is already registered")]
    EmailTaken,
    #[error("database error while inserting user: {0}")]
    Database(#[from] sqlx::Error),
}

/// A user who signed up with email and password; the email starts unverified.
///
/// Returns `None`, without failing the caller's transaction, when the email is already
/// registered (also when a concurrent signup for it commits first).
pub async fn insert_user(
    connection: &mut PgConnection,
    email: &EmailAddress,
    password_hash: &str,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) ",
        "ON CONFLICT (email) DO NOTHING RETURNING ",
        user_columns!()
    ))
    .bind(Uuid::new_v4())
    .bind(email.as_str())
    .bind(password_hash)
    .fetch_optional(connection)
    .await
}

/// Users created through OAuth have no password until they set one via password reset.
pub async fn insert_oauth_user(
    connection: &mut PgConnection,
    email: &EmailAddress,
) -> Result<User, InsertUserError> {
    let insertion = sqlx::query_as(concat!(
        "INSERT INTO users (id, email, email_verified_at) VALUES ($1, $2, now()) RETURNING ",
        user_columns!()
    ))
    .bind(Uuid::new_v4())
    .bind(email.as_str())
    .fetch_one(connection)
    .await;

    insertion.map_err(map_unique_violation)
}

/// A user without password or provider, for magic-link logins. `None` when the email is taken.
pub async fn insert_passwordless_user(
    connection: &mut PgConnection,
    email: &EmailAddress,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING ",
        user_columns!()
    ))
    .bind(Uuid::new_v4())
    .bind(email.as_str())
    .fetch_optional(connection)
    .await
}

fn map_unique_violation(error: sqlx::Error) -> InsertUserError {
    let database_error = error.as_database_error();

    if database_error.is_some_and(DatabaseError::is_unique_violation) {
        return InsertUserError::EmailTaken;
    }

    InsertUserError::Database(error)
}
