use sqlx::PgPool;
use time::Duration;
use uuid::Uuid;

use crate::modules::oauth::provider::oauth_provider::OAuthProvider;

/// Long enough to sign in at the provider, short enough to limit replay of a leaked state.
const STATE_LIFETIME: Duration = Duration::minutes(10);

#[derive(Debug, thiserror::Error)]
pub enum OAuthStateError {
    #[error("database error while accessing OAuth state: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored OAuth state has an unknown provider")]
    UnknownProvider,
}

/// An authorization started by `/authorize` and waiting for the provider callback.
pub struct PendingAuthorization {
    pub tenant_id: Uuid,
    pub provider: OAuthProvider,
    pub pkce_verifier_ciphertext: Vec<u8>,
    pub redirect_to: String,
    /// The app's own PKCE challenge, carried to the login code it will redeem.
    pub app_code_challenge: String,
}

#[derive(sqlx::FromRow)]
struct PendingAuthorizationRow {
    tenant_id: Uuid,
    provider: String,
    pkce_verifier_ciphertext: Vec<u8>,
    redirect_to: String,
    app_code_challenge: String,
}

pub async fn insert_pending_authorization(
    pool: &PgPool,
    state_hash: &[u8],
    pending: &PendingAuthorization,
) -> Result<(), OAuthStateError> {
    sqlx::query(
        "INSERT INTO oauth_authorization_states (state_hash, tenant_id, provider, pkce_verifier_ciphertext, redirect_to, app_code_challenge, expires_at) \
         VALUES ($1, $2, $3, $4, $5, $6, now() + $7::bigint * interval '1 second')",
    )
    .bind(state_hash)
    .bind(pending.tenant_id)
    .bind(pending.provider.as_str())
    .bind(&pending.pkce_verifier_ciphertext)
    .bind(&pending.redirect_to)
    .bind(&pending.app_code_challenge)
    .bind(STATE_LIFETIME.whole_seconds())
    .execute(pool)
    .await?;

    Ok(())
}

/// Deletes and returns the authorization, so each state can complete at most one login.
pub async fn take_pending_authorization(
    pool: &PgPool,
    state_hash: &[u8],
) -> Result<Option<PendingAuthorization>, OAuthStateError> {
    let row: Option<PendingAuthorizationRow> = sqlx::query_as(
        "DELETE FROM oauth_authorization_states WHERE state_hash = $1 AND expires_at > now() \
         RETURNING tenant_id, provider, pkce_verifier_ciphertext, redirect_to, app_code_challenge",
    )
    .bind(state_hash)
    .fetch_optional(pool)
    .await?;
    let Some(row) = row else {
        return Ok(None);
    };
    let Some(provider) = OAuthProvider::parse(&row.provider) else {
        return Err(OAuthStateError::UnknownProvider);
    };

    Ok(Some(PendingAuthorization {
        tenant_id: row.tenant_id,
        provider,
        pkce_verifier_ciphertext: row.pkce_verifier_ciphertext,
        redirect_to: row.redirect_to,
        app_code_challenge: row.app_code_challenge,
    }))
}

/// Binds the encrypted PKCE verifier to its tenant and provider.
pub fn pkce_verifier_context(tenant_id: Uuid, provider: OAuthProvider) -> String {
    format!("oauth_pkce_verifier:{tenant_id}:{}", provider.as_str())
}

/// Abandoned authorizations would otherwise accumulate; run periodically, off the request path.
pub async fn delete_expired_authorizations(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM oauth_authorization_states WHERE expires_at < now()")
        .execute(pool)
        .await?;

    Ok(())
}
