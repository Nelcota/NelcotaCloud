use sqlx::PgPool;

use crate::modules::oauth::provider::oauth_provider_repository::{
    ProviderKey, ProviderRegistration, client_secret_context, upsert_provider_credentials,
};
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};

#[derive(Debug, thiserror::Error)]
pub enum SaveOAuthCredentialsError {
    #[error("client_id and client_secret must not be blank")]
    Blank,
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("database error while saving OAuth credentials: {0}")]
    Database(#[from] sqlx::Error),
}

/// The tenant's own OAuth app at one provider, with its secret still in clear text.
pub struct OAuthCredentialsInput<'a> {
    pub key: ProviderKey,
    pub client_id: &'a str,
    pub client_secret: &'a str,
}

/// Stores the credentials, the client secret encrypted and bound to its tenant and provider.
pub async fn save_provider_credentials(
    control_plane_pool: &PgPool,
    secret_box: &SecretBox,
    credentials: OAuthCredentialsInput<'_>,
) -> Result<(), SaveOAuthCredentialsError> {
    let (client_id, client_secret) = trimmed_credentials(&credentials)?;
    let key = credentials.key;
    let secret_bytes = client_secret.as_bytes();
    let client_secret_ciphertext = secret_box.seal(secret_bytes, &client_secret_context(key))?;
    let registration = ProviderRegistration {
        tenant_id: key.tenant_id,
        provider: key.provider,
        client_id,
        client_secret_ciphertext: &client_secret_ciphertext,
    };
    upsert_provider_credentials(control_plane_pool, registration).await?;

    Ok(())
}

/// The length check accepts whitespace-only values, which would be stored as empty strings.
fn trimmed_credentials<'a>(
    credentials: &OAuthCredentialsInput<'a>,
) -> Result<(&'a str, &'a str), SaveOAuthCredentialsError> {
    let client_id = credentials.client_id.trim();
    let client_secret = credentials.client_secret.trim();

    if client_id.is_empty() || client_secret.is_empty() {
        return Err(SaveOAuthCredentialsError::Blank);
    }

    Ok((client_id, client_secret))
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::*;
    use crate::modules::oauth::provider::oauth_provider::OAuthProvider;

    fn credentials<'a>(client_id: &'a str, client_secret: &'a str) -> OAuthCredentialsInput<'a> {
        OAuthCredentialsInput {
            key: ProviderKey {
                tenant_id: Uuid::new_v4(),
                provider: OAuthProvider::GitHub,
            },
            client_id,
            client_secret,
        }
    }

    #[test]
    fn trims_what_the_admin_pasted() {
        let trimmed = trimmed_credentials(&credentials(" id ", "\tsecret\n"));

        assert!(matches!(trimmed, Ok(("id", "secret"))));
    }

    #[test]
    fn refuses_whitespace_only_values() {
        for (client_id, client_secret) in [("   ", "secret"), ("id", "  "), ("", "")] {
            let trimmed = trimmed_credentials(&credentials(client_id, client_secret));
            assert!(matches!(trimmed, Err(SaveOAuthCredentialsError::Blank)));
        }
    }
}
