use serde::Serialize;
use sqlx::{PgExecutor, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::email_address::EmailAddress;

pub(crate) const USER_COLUMNS: &str = "id, email, email_verified_at, created_at";

#[derive(Debug, thiserror::Error)]
pub enum InsertUserError {
    #[error("email is already registered")]
    EmailTaken,
    #[error("database error while inserting user: {0}")]
    Database(#[from] sqlx::Error),
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(with = "time::serde::rfc3339::option")]
    pub email_verified_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Debug, sqlx::FromRow)]
pub struct UserCredentials {
    #[sqlx(flatten)]
    pub user: User,
    pub password_hash: Option<String>,
}

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

pub async fn find_credentials_by_email(
    pool: &PgPool,
    email: &EmailAddress,
) -> Result<Option<UserCredentials>, sqlx::Error> {
    let query = format!("SELECT {USER_COLUMNS}, password_hash FROM users WHERE email = $1");

    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(email.as_str())
        .fetch_optional(pool)
        .await
}

pub async fn find_user_by_email<'e>(
    executor: impl PgExecutor<'e>,
    email: &EmailAddress,
) -> Result<Option<User>, sqlx::Error> {
    let query = format!("SELECT {USER_COLUMNS} FROM users WHERE email = $1");

    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(email.as_str())
        .fetch_optional(executor)
        .await
}

pub async fn find_user_by_id(pool: &PgPool, user_id: Uuid) -> Result<Option<User>, sqlx::Error> {
    let query = format!("SELECT {USER_COLUMNS} FROM users WHERE id = $1");

    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(user_id)
        .fetch_optional(pool)
        .await
}

pub(crate) fn map_unique_violation(error: sqlx::Error) -> InsertUserError {
    if error
        .as_database_error()
        .is_some_and(|database_error| database_error.is_unique_violation())
    {
        return InsertUserError::EmailTaken;
    }

    InsertUserError::Database(error)
}
