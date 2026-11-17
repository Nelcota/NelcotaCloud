use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::auth::user::user_record::{User, user_columns};

/// Reads the user and locks its row until the transaction ends, before deciding on it: a
/// concurrent link, takeover or ban waits instead of acting on what this read saw.
pub async fn lock_user_by_email(
    connection: &mut PgConnection,
    email: &EmailAddress,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        " FROM users WHERE email = $1 FOR UPDATE"
    ))
    .bind(email.as_str())
    .fetch_optional(connection)
    .await
}

/// Like `lock_user_by_email`, by id.
pub async fn lock_user_by_id(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        user_columns!(),
        " FROM users WHERE id = $1 FOR UPDATE"
    ))
    .bind(user_id)
    .fetch_optional(connection)
    .await
}
