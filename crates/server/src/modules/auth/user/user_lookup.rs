use sqlx::{PgExecutor, PgPool};
use uuid::Uuid;

use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_record::{USER_COLUMNS, User, UserCredentials};

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
