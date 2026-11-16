use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::shared::crypto::opaque_token::{OpaqueToken, hash_opaque_token};
use crate::shared::time::expiry::{ExpiryOutOfRange, expiry_after};

#[derive(Debug, thiserror::Error)]
pub enum IssueOneTimeTokenError {
    #[error("database error while storing a one-time token: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Expiry(#[from] ExpiryOutOfRange),
}

/// Creates a token and returns its plaintext; only the hash is stored.
pub async fn issue_one_time_token(
    pool: &PgPool,
    user_id: Uuid,
    purpose: OneTimeTokenPurpose,
) -> Result<String, IssueOneTimeTokenError> {
    let token = OpaqueToken::generate(purpose.token_prefix());
    let expires_at = expiry_after(OffsetDateTime::now_utc(), purpose.lifetime())?;
    sqlx::query(
        "INSERT INTO one_time_tokens (id, user_id, purpose, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(purpose.as_str())
    .bind(&token.hash)
    .bind(expires_at)
    .execute(pool)
    .await?;

    Ok(token.plaintext)
}

/// Returns the token's user if it was valid. Every other pending token of the same purpose for
/// that user is consumed too, so older links stop working once one of them is used.
pub async fn consume_one_time_token(
    pool: &PgPool,
    purpose: OneTimeTokenPurpose,
    plaintext: &str,
) -> Result<Option<Uuid>, sqlx::Error> {
    let token_hash = hash_opaque_token(plaintext.trim());
    let user_id: Option<Uuid> = sqlx::query_scalar(
        "UPDATE one_time_tokens SET consumed_at = now() WHERE token_hash = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > now() RETURNING user_id",
    )
    .bind(&token_hash)
    .bind(purpose.as_str())
    .fetch_optional(pool)
    .await?;
    let Some(user_id) = user_id else {
        return Ok(None);
    };
    consume_pending_tokens(pool, user_id, purpose).await?;

    Ok(Some(user_id))
}

async fn consume_pending_tokens(
    pool: &PgPool,
    user_id: Uuid,
    purpose: OneTimeTokenPurpose,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE one_time_tokens SET consumed_at = now() WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL",
    )
    .bind(user_id)
    .bind(purpose.as_str())
    .execute(pool)
    .await?;

    Ok(())
}
