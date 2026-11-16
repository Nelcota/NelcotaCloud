use oauth2::{AuthorizationCode, PkceCodeVerifier, TokenResponse};
use sqlx::PgPool;

use crate::modules::auth::user::user_record::User;
use crate::modules::oauth::client::oauth_http_client::OAuthHttpClient;
use crate::modules::oauth::identity::account_linker::resolve_oauth_user;
use crate::modules::oauth::login::oauth_login_context::OAuthLoginContext;
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::login::oauth_state_repository::{
    PendingAuthorization, pkce_verifier_context,
};
use crate::modules::oauth::profile::provider_profile::{ProfileRequest, fetch_profile};
use crate::modules::oauth::provider::oauth_provider_repository::ProviderKey;

/// The provider called us back for a pending authorization of `tenant_pool`'s tenant.
pub struct ProviderCallback<'a> {
    pub pending: &'a PendingAuthorization,
    pub tenant_pool: &'a PgPool,
    pub code: Option<String>,
}

impl OAuthLoginContext<'_> {
    /// Exchanges the code (with the PKCE verifier), reads the profile and resolves the user.
    pub async fn finish(&self, callback: ProviderCallback<'_>) -> Result<User, OAuthLoginError> {
        let pending = callback.pending;
        let provider = pending.provider;
        let Some(code) = callback.code else {
            return Err(OAuthLoginError::ProviderDenied);
        };
        let access_token = self.exchange_code(pending, code).await?;
        let profile_request = ProfileRequest {
            http_client: self.http_client,
            endpoints: self.endpoints.for_provider(provider),
            access_token: &access_token,
        };
        let profile = fetch_profile(provider, &profile_request).await?;

        Ok(resolve_oauth_user(callback.tenant_pool, provider, &profile).await?)
    }

    /// Returns the provider's access token for the signed-in user.
    async fn exchange_code(
        &self,
        pending: &PendingAuthorization,
        code: String,
    ) -> Result<String, OAuthLoginError> {
        let key = ProviderKey {
            tenant_id: pending.tenant_id,
            provider: pending.provider,
        };
        let client = self.client_for(key).await?;
        let verifier_context = pkce_verifier_context(pending.tenant_id, pending.provider);
        let verifier_bytes = self
            .secret_box
            .open(&pending.pkce_verifier_ciphertext, &verifier_context)?;
        let verifier =
            String::from_utf8(verifier_bytes).map_err(|_| OAuthLoginError::InvalidVerifier)?;
        let http_client = OAuthHttpClient::new(self.http_client.clone());
        let token = client
            .exchange_code(AuthorizationCode::new(code))
            .set_pkce_verifier(PkceCodeVerifier::new(verifier))
            .request_async(&http_client)
            .await
            .map_err(|error| OAuthLoginError::TokenExchange(error.to_string()))?;

        Ok(token.access_token().secret().clone())
    }
}
