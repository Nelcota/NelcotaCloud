use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::shared::crypto::opaque_token::{OpaqueToken, TokenHash};

/// Stores only a hashed link and its intended inbox until the recipient confirms ownership.
pub async fn issue_pending_magic_link(
    pool: &PgPool,
    email: &EmailAddress,
    user_id: Option<Uuid>,
) -> Result<String, sqlx::Error> {
    let purpose = OneTimeTokenPurpose::MagicLink;
    let token = OpaqueToken::generate(purpose.token_prefix());
    sqlx::query(
        "INSERT INTO pending_magic_links (token_hash, email, user_id, expires_at)
         VALUES ($1, $2, $3, clock_timestamp() + $4::bigint * interval '1 second')",
    )
    .bind(token.hash)
    .bind(email.as_str())
    .bind(user_id)
    .bind(purpose.lifetime().whole_seconds())
    .execute(pool)
    .await?;

    Ok(token.plaintext)
}

pub async fn pending_magic_link_email(
    connection: &mut PgConnection,
    token_hash: &TokenHash,
) -> Result<Option<(String, Option<Uuid>)>, sqlx::Error> {
    sqlx::query_as(
        "SELECT email, user_id FROM pending_magic_links WHERE token_hash = $1 AND expires_at > clock_timestamp()",
    )
    .bind(token_hash)
    .fetch_optional(connection)
    .await
}

/// The caller already holds the user's row. Rechecks expiry and use after waiting for it.
pub async fn consume_pending_magic_link(
    connection: &mut PgConnection,
    token_hash: &TokenHash,
) -> Result<bool, sqlx::Error> {
    let deleted = sqlx::query(
        "DELETE FROM pending_magic_links WHERE token_hash = $1 AND expires_at > clock_timestamp()",
    )
    .bind(token_hash)
    .execute(connection)
    .await?;

    Ok(deleted.rows_affected() != 0)
}

pub async fn clear_pending_magic_links(
    connection: &mut PgConnection,
    email: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM pending_magic_links WHERE email = $1")
        .bind(email)
        .execute(connection)
        .await?;

    Ok(())
}
