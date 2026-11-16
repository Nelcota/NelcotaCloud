use oauth2::url::Url;
use oauth2::{CsrfToken, PkceCodeChallenge, Scope};
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
        let verifier_context = pkce_verifier_context(start.tenant_id, provider);
        let pending = PendingAuthorization {
            tenant_id: start.tenant_id,
            provider,
            pkce_verifier_ciphertext: self
                .secret_box
                .seal(pkce_verifier.secret().as_bytes(), &verifier_context)?,
            redirect_to: start.redirect_to.to_string(),
            app_code_challenge: start.app_code_challenge,
        };
        let state_hash = hash_opaque_token(csrf_token.secret());
        insert_pending_authorization(self.control_plane_pool, &state_hash, &pending).await?;

        Ok(authorize_url)
    }
}
