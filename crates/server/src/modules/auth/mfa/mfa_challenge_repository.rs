use sqlx::PgConnection;
use uuid::Uuid;

use crate::shared::crypto::opaque_token::{OpaqueToken, TokenHash};

const MFA_CHALLENGE_PREFIX: &str = "nc_mfa_";
/// Long enough to open an authenticator app, short enough to be useless if it leaks.
const MFA_CHALLENGE_LIFETIME_SECONDS: i64 = 5 * 60;
/// Wrong codes allowed per challenge; then the user starts the login again.
const MAX_FAILED_ATTEMPTS: i32 = 5;

/// Starts the second step of a login and returns its token; only the hash is stored.
pub async fn create_mfa_challenge(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<String, sqlx::Error> {
    let token = OpaqueToken::generate(MFA_CHALLENGE_PREFIX);
    sqlx::query(
        "INSERT INTO mfa_challenges (token_hash, user_id, expires_at) VALUES ($1, $2, now() + $3::bigint * interval '1 second')",
    )
    .bind(token.hash)
    .bind(user_id)
    .bind(MFA_CHALLENGE_LIFETIME_SECONDS)
    .execute(connection)
    .await?;

    Ok(token.plaintext)
}

/// Locks the challenge's user (`FOR NO KEY UPDATE`), before the challenge itself.
///
/// Paths that change a user lock its row first, so this waits for a takeover, reset or ban in progress, which
/// also deletes the user's pending challenges. Issuing the session updates the user's last sign-in
/// through a trigger, so take that lock mode up front.
pub async fn lock_challenge_owner(
    connection: &mut PgConnection,
    token_hash: &TokenHash,
) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT users.id FROM users \
         WHERE users.id = (SELECT user_id FROM mfa_challenges WHERE token_hash = $1) FOR NO KEY UPDATE",
    )
    .bind(token_hash)
    .fetch_optional(connection)
    .await
}

/// Locks a usable challenge (not consumed, not expired, attempts left) and returns its user.
pub async fn lock_mfa_challenge(
    connection: &mut PgConnection,
    token_hash: &TokenHash,
) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT user_id FROM mfa_challenges WHERE token_hash = $1 AND consumed_at IS NULL \
         AND expires_at > now() AND failed_attempts < $2 FOR UPDATE",
    )
    .bind(token_hash)
    .bind(MAX_FAILED_ATTEMPTS)
    .fetch_optional(connection)
    .await
}

pub async fn record_failed_mfa_attempt(
    connection: &mut PgConnection,
    token_hash: &TokenHash,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE mfa_challenges SET failed_attempts = failed_attempts + 1 WHERE token_hash = $1",
    )
    .bind(token_hash)
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn consume_mfa_challenge(
    connection: &mut PgConnection,
    token_hash: &TokenHash,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE mfa_challenges SET consumed_at = now() WHERE token_hash = $1")
        .bind(token_hash)
        .execute(connection)
        .await?;

    Ok(())
}
