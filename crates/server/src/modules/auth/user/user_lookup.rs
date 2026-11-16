use sqlx::{PgExecutor, PgPool};
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

pub async fn find_user_by_id(pool: &PgPool, user_id: Uuid) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        " FROM users WHERE id = $1"
    ))
    .bind(user_id)
    .fetch_optional(pool)
    .await
}
