use oauth2::url::{ParseError, Url};
use oauth2::{
    AuthorizationCode, CsrfToken, PkceCodeChallenge, PkceCodeVerifier, Scope, TokenResponse,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::user_repository::User;
use crate::control_plane::oauth_provider_repository::{
    ProviderCredentialsError, ProviderKey, find_provider_credentials,
};
use crate::control_plane::oauth_state_repository::{
    PendingAuthorization, insert_pending_authorization,
};
use crate::crypto::opaque_token::hash_opaque_token;
use crate::crypto::secret_box::{SecretBox, SecretBoxError};
use crate::oauth::account_linker::{AccountLinkError, resolve_oauth_user};
use crate::oauth::oauth_client::{ConfiguredOAuthClient, OAuthClientSettings, build_oauth_client};
use crate::oauth::oauth_http_client::OAuthHttpClient;
use crate::oauth::oauth_provider::OAuthProvider;
use crate::oauth::provider_endpoints::OAuthEndpoints;
use crate::oauth::provider_profile::{ProfileError, ProfileRequest, fetch_profile};
use crate::tenant_database::tenant_pool_registry::TenantPoolError;

#[derive(Debug, thiserror::Error)]
pub enum OAuthLoginError {
    #[error("OAuth provider is not configured for this tenant")]
    ProviderNotConfigured,
    #[error("the user denied access or the provider returned no code")]
    ProviderDenied,
    #[error("invalid OAuth endpoint URL: {0}")]
    InvalidEndpoint(#[from] ParseError),
    #[error(transparent)]
    Credentials(#[from] ProviderCredentialsError),
    #[error("database error during OAuth login: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("stored PKCE verifier is not valid UTF-8")]
    InvalidVerifier,
    #[error("failed to exchange the authorization code: {0}")]
    TokenExchange(String),
    #[error(transparent)]
    Profile(#[from] ProfileError),
    #[error(transparent)]
    AccountLink(#[from] AccountLinkError),
    #[error(transparent)]
    TenantDatabase(#[from] TenantPoolError),
}

impl OAuthLoginError {
    /// The `error` query parameter sent back to the tenant's app; never internal details.
    pub fn redirect_error_code(&self) -> &'static str {
        match self {
            OAuthLoginError::ProviderDenied => "access_denied",
            OAuthLoginError::AccountLink(AccountLinkError::NoVerifiedEmail) => "email_not_verified",
            _ => "server_error",
        }
    }
}

/// Everything the OAuth flow needs from the application.
pub struct OAuthLoginContext<'a> {
    pub control_plane_pool: &'a PgPool,
    pub secret_box: &'a SecretBox,
    pub http_client: &'a reqwest::Client,
    pub endpoints: &'a OAuthEndpoints,
    pub callback_url: &'a str,
}

pub struct AuthorizationStart {
    pub tenant_id: Uuid,
    pub provider: OAuthProvider,
    pub redirect_to: Url,
}

/// The provider called us back for a pending authorization of `tenant_pool`'s tenant.
pub struct ProviderCallback<'a> {
    pub pending: &'a PendingAuthorization,
    pub tenant_pool: &'a PgPool,
    pub code: Option<String>,
}

impl OAuthLoginContext<'_> {
    /// Stores the PKCE verifier under the hashed `state` and returns the provider's sign-in URL.
    pub async fn start(&self, start: AuthorizationStart) -> Result<Url, OAuthLoginError> {
        let provider = start.provider;
        let client = self
            .client_for(ProviderKey {
                tenant_id: start.tenant_id,
                provider,
            })
            .await?;
        let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
        let scopes = provider
            .scopes()
            .iter()
            .map(|scope| Scope::new((*scope).to_owned()));
        let (authorize_url, csrf_token) = client
            .authorize_url(CsrfToken::new_random)
            .add_scopes(scopes)
            .set_pkce_challenge(pkce_challenge)
            .url();
        let pending = PendingAuthorization {
            tenant_id: start.tenant_id,
            provider,
            pkce_verifier_ciphertext: self.secret_box.seal(pkce_verifier.secret().as_bytes())?,
            redirect_to: start.redirect_to.to_string(),
        };
        let state_hash = hash_opaque_token(csrf_token.secret());
        insert_pending_authorization(self.control_plane_pool, &state_hash, &pending).await?;

        Ok(authorize_url)
    }

    /// Exchanges the code (with the PKCE verifier), reads the profile and resolves the user.
    pub async fn finish(&self, callback: ProviderCallback<'_>) -> Result<User, OAuthLoginError> {
        let pending = callback.pending;
        let provider = pending.provider;
        let Some(code) = callback.code else {
            return Err(OAuthLoginError::ProviderDenied);
        };
        let client = self
            .client_for(ProviderKey {
                tenant_id: pending.tenant_id,
                provider,
            })
            .await?;
        let verifier_bytes = self.secret_box.open(&pending.pkce_verifier_ciphertext)?;
        let verifier =
            String::from_utf8(verifier_bytes).map_err(|_| OAuthLoginError::InvalidVerifier)?;
        let http_client = OAuthHttpClient::new(self.http_client.clone());
        let token = client
            .exchange_code(AuthorizationCode::new(code))
            .set_pkce_verifier(PkceCodeVerifier::new(verifier))
            .request_async(&http_client)
            .await
            .map_err(|error| OAuthLoginError::TokenExchange(error.to_string()))?;
        let profile_request = ProfileRequest {
            http_client: self.http_client,
            endpoints: self.endpoints.for_provider(provider),
            access_token: token.access_token().secret(),
        };
        let profile = fetch_profile(provider, &profile_request).await?;

        Ok(resolve_oauth_user(callback.tenant_pool, provider, &profile).await?)
    }

    async fn client_for(&self, key: ProviderKey) -> Result<ConfiguredOAuthClient, OAuthLoginError> {
        let credentials =
            find_provider_credentials(self.control_plane_pool, key, self.secret_box).await?;
        let Some(credentials) = credentials else {
            return Err(OAuthLoginError::ProviderNotConfigured);
        };
        let settings = OAuthClientSettings {
            credentials: &credentials,
            endpoints: self.endpoints.for_provider(key.provider),
            callback_url: self.callback_url,
        };

        Ok(build_oauth_client(&settings)?)
    }
}
