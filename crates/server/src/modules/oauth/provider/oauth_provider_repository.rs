use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};

#[derive(Debug, thiserror::Error)]
pub enum ProviderCredentialsError {
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
         ON CONFLICT (tenant_id, provider) DO UPDATE SET client_id = EXCLUDED.client_id, client_secret_ciphertext = EXCLUDED.client_secret_ciphertext, updated_at = now()",
    )
    .bind(registration.tenant_id)
    .bind(registration.provider.as_str())
    .bind(registration.client_id)
    .bind(registration.client_secret_ciphertext)
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
) -> Result<Option<ProviderCredentials>, ProviderCredentialsError> {
    let row: Option<(String, Vec<u8>)> = sqlx::query_as(
        "SELECT client_id, client_secret_ciphertext FROM tenant_oauth_providers WHERE tenant_id = $1 AND provider = $2",
    )
    .bind(key.tenant_id)
    .bind(key.provider.as_str())
    .fetch_optional(pool)
    .await?;
    let Some((client_id, ciphertext)) = row else {
        return Ok(None);
    };
    let secret_bytes = secret_box.open(&ciphertext)?;
    let client_secret =
        String::from_utf8(secret_bytes).map_err(|_| ProviderCredentialsError::InvalidSecret)?;

    Ok(Some(ProviderCredentials {
        client_id,
        client_secret,
    }))
}
