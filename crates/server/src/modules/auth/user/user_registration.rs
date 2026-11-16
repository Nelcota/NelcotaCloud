use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_record::{USER_COLUMNS, User};

#[derive(Debug, thiserror::Error)]
pub enum InsertUserError {
    #[error("email is already registered")]
    EmailTaken,
    #[error("database error while inserting user: {0}")]
    Database(#[from] sqlx::Error),
}

/// A user who signed up with email and password; the email starts unverified.
pub async fn insert_user(
    pool: &PgPool,
    email: &EmailAddress,
    password_hash: &str,
) -> Result<User, InsertUserError> {
    let query = format!(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING {USER_COLUMNS}"
    );
    let insertion = sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(Uuid::new_v4())
        .bind(email.as_str())
        .bind(password_hash)
        .fetch_one(pool)
        .await;

    insertion.map_err(map_unique_violation)
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

fn map_unique_violation(error: sqlx::Error) -> InsertUserError {
    let database_error = error.as_database_error();

    if database_error.is_some_and(|database_error| database_error.is_unique_violation()) {
        return InsertUserError::EmailTaken;
    }

    InsertUserError::Database(error)
}
