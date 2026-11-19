use oauth_providers::{generate_code_verifier, generate_state};
use url::Url;
use uuid::Uuid;

use crate::modules::oauth::login::oauth_login_context::OAuthLoginContext;
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::login::oauth_state_repository::{
    PendingAuthorization, insert_pending_authorization, pkce_verifier_context,
};
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::provider::oauth_provider_repository::ProviderKey;
use crate::shared::crypto::opaque_token::hash_opaque_token;

pub struct AuthorizationStart {
    pub tenant_id: Uuid,
    pub provider: OAuthProvider,
    pub redirect_to: Url,
    /// S256 challenge of the verifier the tenant's app keeps to redeem the login code.
    pub app_code_challenge: String,
}

impl OAuthLoginContext<'_> {
    /// Stores the PKCE verifier under the hashed `state` and returns the provider's sign-in URL.
    pub async fn start(&self, start: AuthorizationStart) -> Result<Url, OAuthLoginError> {
        let provider = start.provider;
        let key = ProviderKey {
            tenant_id: start.tenant_id,
            provider,
        };
        let client = self.client_for(key).await?;
        let state = generate_state();
        let pkce_verifier = generate_code_verifier();
        let authorize_url = client.authorization_url(&state, &pkce_verifier);
        let pending = self.pending_authorization(start, &pkce_verifier)?;
        let state_hash = hash_opaque_token(&state);
        insert_pending_authorization(self.control_plane_pool, &state_hash, &pending).await?;

        Ok(authorize_url)
    }

    /// What the callback needs, with the PKCE verifier encrypted for its tenant and provider.
    fn pending_authorization(
        &self,
        start: AuthorizationStart,
        pkce_verifier: &str,
    ) -> Result<PendingAuthorization, OAuthLoginError> {
        let verifier_context = pkce_verifier_context(start.tenant_id, start.provider);
        let verifier_bytes = pkce_verifier.as_bytes();
        let pkce_verifier_ciphertext = self.secret_box.seal(verifier_bytes, &verifier_context)?;

        Ok(PendingAuthorization {
            tenant_id: start.tenant_id,
            provider: start.provider,
            pkce_verifier_ciphertext,
            redirect_to: start.redirect_to.to_string(),
            app_code_challenge: start.app_code_challenge,
        })
    }
}
