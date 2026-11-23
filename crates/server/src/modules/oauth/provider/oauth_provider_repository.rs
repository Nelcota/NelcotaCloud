use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};

#[derive(Debug, thiserror::Error)]
pub enum LoadOAuthCredentialsError {
    #[error("database error while accessing OAuth provider credentials: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Decryption(#[from] SecretBoxError),
    #[error("stored OAuth client secret is not valid UTF-8")]
    InvalidSecret,
}

/// The tenant's own OAuth app at the provider.
pub struct ProviderCredentials {
    pub client_id: String,
    pub client_secret: String,
    pub revision: Uuid,
}

pub struct ProviderRegistration<'a> {
    pub tenant_id: Uuid,
    pub provider: OAuthProvider,
    pub client_id: &'a str,
    pub client_secret_ciphertext: &'a [u8],
}

pub async fn upsert_provider_credentials(
    pool: &PgPool,
    registration: ProviderRegistration<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tenant_oauth_providers (tenant_id, provider, client_id, client_secret_ciphertext) VALUES ($1, $2, $3, $4) \
         ON CONFLICT (tenant_id, provider) DO UPDATE SET client_id = EXCLUDED.client_id,
            client_secret_ciphertext = EXCLUDED.client_secret_ciphertext, revision = EXCLUDED.revision, updated_at = now()",
    )
    .bind(registration.tenant_id)
    .bind(registration.provider.as_str())
    .bind(registration.client_id)
    .bind(registration.client_secret_ciphertext)
    .execute(pool)
    .await?;

    Ok(())
}

/// Removes the tenant's OAuth app, so logins with that provider stop being offered.
pub async fn delete_provider_credentials(
    pool: &PgPool,
    key: ProviderKey,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tenant_oauth_providers WHERE tenant_id = $1 AND provider = $2")
        .bind(key.tenant_id)
        .bind(key.provider.as_str())
        .execute(pool)
        .await?;

    Ok(())
}

#[derive(Debug, Clone, Copy)]
pub struct ProviderKey {
    pub tenant_id: Uuid,
    pub provider: OAuthProvider,
}

pub async fn find_provider_credentials(
    pool: &PgPool,
    key: ProviderKey,
    secret_box: &SecretBox,
) -> Result<Option<ProviderCredentials>, LoadOAuthCredentialsError> {
    let row: Option<(String, Vec<u8>, Uuid)> = sqlx::query_as(
        "SELECT client_id, client_secret_ciphertext, revision FROM tenant_oauth_providers WHERE tenant_id = $1 AND provider = $2",
    )
    .bind(key.tenant_id)
    .bind(key.provider.as_str())
    .fetch_optional(pool)
    .await?;
    let (client_id, ciphertext, revision) = match row {
        Some(row) => row,
        None => return Ok(None),
    };
    let secret_bytes = secret_box.open(&ciphertext, &client_secret_context(key))?;
    let client_secret =
        String::from_utf8(secret_bytes).map_err(|_| LoadOAuthCredentialsError::InvalidSecret)?;

    Ok(Some(ProviderCredentials {
        client_id,
        client_secret,
        revision,
    }))
}

pub async fn is_current_revision(
    pool: &PgPool,
    key: ProviderKey,
    revision: Uuid,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM tenant_oauth_providers
         WHERE tenant_id = $1 AND provider = $2 AND revision = $3)",
    )
    .bind(key.tenant_id)
    .bind(key.provider.as_str())
    .bind(revision)
    .fetch_one(pool)
    .await
}

/// Binds the encrypted client secret to its tenant and provider.
pub fn client_secret_context(key: ProviderKey) -> String {
    format!(
        "oauth_client_secret:{}:{}",
        key.tenant_id,
        key.provider.as_str()
    )
}
