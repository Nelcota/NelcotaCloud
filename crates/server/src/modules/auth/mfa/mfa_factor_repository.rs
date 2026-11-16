use sqlx::{PgConnection, PgExecutor};
use time::OffsetDateTime;
use uuid::Uuid;

/// A user's TOTP authenticator, with its secret still encrypted.
#[derive(sqlx::FromRow)]
pub struct StoredMfaFactor {
    pub id: Uuid,
    pub secret_ciphertext: Vec<u8>,
    pub verified_at: Option<OffsetDateTime>,
}

pub async fn find_mfa_factor<'e>(
    executor: impl PgExecutor<'e>,
    user_id: Uuid,
) -> Result<Option<StoredMfaFactor>, sqlx::Error> {
    sqlx::query_as("SELECT id, secret_ciphertext, verified_at FROM mfa_factors WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(executor)
        .await
}

pub async fn has_verified_mfa_factor(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM mfa_factors WHERE user_id = $1 AND verified_at IS NOT NULL)",
    )
    .bind(user_id)
    .fetch_one(connection)
    .await
}

pub struct PendingMfaFactor<'a> {
    pub id: Uuid,
    pub user_id: Uuid,
    pub secret_ciphertext: &'a [u8],
}

/// Stores a new authenticator waiting for its first code, replacing an earlier pending one.
/// `false`, changing nothing, when the user already has a verified authenticator.
pub async fn replace_pending_mfa_factor<'e>(
    executor: impl PgExecutor<'e>,
    factor: PendingMfaFactor<'_>,
) -> Result<bool, sqlx::Error> {
    let stored: Option<Uuid> = sqlx::query_scalar(
        "INSERT INTO mfa_factors (id, user_id, secret_ciphertext) VALUES ($1, $2, $3) \
         ON CONFLICT (user_id) DO UPDATE SET id = EXCLUDED.id, secret_ciphertext = EXCLUDED.secret_ciphertext, \
         last_used_step = 0, created_at = now() WHERE mfa_factors.verified_at IS NULL RETURNING id",
    )
    .bind(factor.id)
    .bind(factor.user_id)
    .bind(factor.secret_ciphertext)
    .fetch_optional(executor)
    .await?;

    Ok(stored.is_some())
}

/// Records that a code of `step` was used, verifying the authenticator on its first code.
/// `false` when that step (or a later one) was already used: the code is a replay.
pub async fn use_mfa_step(
    connection: &mut PgConnection,
    factor_id: Uuid,
    step: i64,
) -> Result<bool, sqlx::Error> {
    let accepted: Option<Uuid> = sqlx::query_scalar(
        "UPDATE mfa_factors SET last_used_step = $2, verified_at = COALESCE(verified_at, now()) \
         WHERE id = $1 AND last_used_step < $2 RETURNING id",
    )
    .bind(factor_id)
    .bind(step)
    .fetch_optional(connection)
    .await?;

    Ok(accepted.is_some())
}

/// `false` if the user had no authenticator.
pub async fn delete_mfa_factor<'e>(
    executor: impl PgExecutor<'e>,
    user_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let deleted: Option<Uuid> =
        sqlx::query_scalar("DELETE FROM mfa_factors WHERE user_id = $1 RETURNING id")
            .bind(user_id)
            .fetch_optional(executor)
            .await?;

    Ok(deleted.is_some())
}

/// Binds the encrypted secret to its tenant and factor, so it cannot be replayed elsewhere.
pub fn mfa_secret_context(tenant_id: Uuid, factor_id: Uuid) -> String {
    format!("mfa_totp:{tenant_id}:{factor_id}")
}
