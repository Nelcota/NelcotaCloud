use sqlx::PgPool;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::shared::time::expiry::{ExpiryOutOfRange, expiry_after};

/// Long enough to sign in at the provider, short enough to limit replay of a leaked state.
const STATE_LIFETIME: Duration = Duration::minutes(10);

#[derive(Debug, thiserror::Error)]
pub enum OAuthStateError {
    #[error("database error while accessing OAuth state: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored OAuth state has an unknown provider")]
    UnknownProvider,
    #[error(transparent)]
    Expiry(#[from] ExpiryOutOfRange),
}

/// An authorization started by `/authorize` and waiting for the provider callback.
pub struct PendingAuthorization {
    pub tenant_id: Uuid,
    pub provider: OAuthProvider,
    pub pkce_verifier_ciphertext: Vec<u8>,
    pub redirect_to: String,
}

pub async fn insert_pending_authorization(
    pool: &PgPool,
    state_hash: &[u8],
    pending: &PendingAuthorization,
) -> Result<(), OAuthStateError> {
    let expires_at = expiry_after(OffsetDateTime::now_utc(), STATE_LIFETIME)?;
    // Housekeeping: abandoned authorizations would otherwise accumulate forever.
    sqlx::query("DELETE FROM oauth_authorization_states WHERE expires_at < now()")
        .execute(pool)
        .await?;
    sqlx::query(
        "INSERT INTO oauth_authorization_states (state_hash, tenant_id, provider, pkce_verifier_ciphertext, redirect_to, expires_at) VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(state_hash)
    .bind(pending.tenant_id)
    .bind(pending.provider.as_str())
    .bind(&pending.pkce_verifier_ciphertext)
    .bind(&pending.redirect_to)
    .bind(expires_at)
    .execute(pool)
    .await?;

    Ok(())
}

/// Deletes and returns the authorization, so each state can complete at most one login.
pub async fn take_pending_authorization(
    pool: &PgPool,
    state_hash: &[u8],
) -> Result<Option<PendingAuthorization>, OAuthStateError> {
    let row: Option<(Uuid, String, Vec<u8>, String)> = sqlx::query_as(
        "DELETE FROM oauth_authorization_states WHERE state_hash = $1 AND expires_at > now() RETURNING tenant_id, provider, pkce_verifier_ciphertext, redirect_to",
    )
    .bind(state_hash)
    .fetch_optional(pool)
    .await?;
    let Some((tenant_id, raw_provider, pkce_verifier_ciphertext, redirect_to)) = row else {
        return Ok(None);
    };
    let Some(provider) = OAuthProvider::parse(&raw_provider) else {
        return Err(OAuthStateError::UnknownProvider);
    };

    Ok(Some(PendingAuthorization {
        tenant_id,
        provider,
        pkce_verifier_ciphertext,
        redirect_to,
    }))
}
