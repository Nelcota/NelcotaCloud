use sqlx::{PgConnection, PgExecutor};
use uuid::Uuid;

use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::shared::crypto::opaque_token::{OpaqueToken, hash_opaque_token};

pub struct OneTimeTokenRequest<'a> {
    pub user_id: Uuid,
    pub purpose: OneTimeTokenPurpose,
    /// PKCE challenge of the app that will redeem the token (OAuth login codes only).
    pub code_challenge: Option<&'a str>,
}

pub struct ConsumedOneTimeToken {
    pub user_id: Uuid,
    pub code_challenge: Option<String>,
}

/// Creates a token and returns its plaintext; only the hash is stored.
///
/// The expiry comes from the database clock, the same clock that checks it on consumption.
pub async fn issue_one_time_token<'e>(
    executor: impl PgExecutor<'e>,
    request: OneTimeTokenRequest<'_>,
) -> Result<String, sqlx::Error> {
    let purpose = request.purpose;
    let token = OpaqueToken::generate(purpose.token_prefix());
    sqlx::query(
        "INSERT INTO one_time_tokens (id, user_id, purpose, token_hash, expires_at, code_challenge) \
         VALUES ($1, $2, $3, $4, now() + $5::bigint * interval '1 second', $6)",
    )
    .bind(Uuid::new_v4())
    .bind(request.user_id)
    .bind(purpose.as_str())
    .bind(token.hash)
    .bind(purpose.lifetime().whole_seconds())
    .bind(request.code_challenge)
    .execute(executor)
    .await?;

    Ok(token.plaintext)
}

/// Consumes a valid token. For emailed links, the user's other pending links of the same
/// purpose are consumed too, so older links stop working once one of them is used.
///
/// Locks the user's row before the token rows, the order every user-changing path follows,
/// so concurrent consumptions and signups cannot deadlock. Call it inside a transaction.
pub async fn consume_one_time_token(
    connection: &mut PgConnection,
    purpose: OneTimeTokenPurpose,
    plaintext: &str,
) -> Result<Option<ConsumedOneTimeToken>, sqlx::Error> {
    let token_hash = hash_opaque_token(plaintext.trim());
    let Some(owner_id) = lock_token_owner(connection, purpose, token_hash).await? else {
        return Ok(None);
    };
    let consumed: Option<(Uuid, Option<String>)> = sqlx::query_as(
        "UPDATE one_time_tokens SET consumed_at = now() WHERE token_hash = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > now() RETURNING user_id, code_challenge",
    )
    .bind(token_hash)
    .bind(purpose.as_str())
    .fetch_optional(&mut *connection)
    .await?;
    let Some((user_id, code_challenge)) = consumed else {
        return Ok(None);
    };

    if purpose.supersedes_pending_tokens() {
        invalidate_pending_tokens(connection, owner_id, purpose).await?;
    }

    Ok(Some(ConsumedOneTimeToken {
        user_id,
        code_challenge,
    }))
}

/// Locks the row of the user the token belongs to and returns its id.
async fn lock_token_owner(
    connection: &mut PgConnection,
    purpose: OneTimeTokenPurpose,
    token_hash: [u8; 32],
) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT users.id FROM users \
         WHERE users.id = (SELECT user_id FROM one_time_tokens WHERE token_hash = $1 AND purpose = $2) \
         FOR UPDATE",
    )
    .bind(token_hash)
    .bind(purpose.as_str())
    .fetch_optional(connection)
    .await
}

pub async fn invalidate_pending_tokens(
    connection: &mut PgConnection,
    user_id: Uuid,
    purpose: OneTimeTokenPurpose,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE one_time_tokens SET consumed_at = now() WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL",
    )
    .bind(user_id)
    .bind(purpose.as_str())
    .execute(connection)
    .await?;

    Ok(())
}
