use sqlx::PgPool;

use crate::modules::auth::integration::oauth_identity::User;
use crate::modules::oauth::identity::account_linker::resolve_oauth_user;
use crate::modules::oauth::login::oauth_login_context::OAuthLoginContext;
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::login::oauth_state_repository::{
    PendingAuthorization, pkce_verifier_context,
};
use crate::modules::oauth::profile::provider_adapter::ProviderAdapter;
use crate::modules::oauth::provider::oauth_provider_repository::{
    ProviderKey, is_current_revision,
};
use crate::modules::webhooks::outbox::webhook_recorder::WebhookRecorder;

/// The provider called us back for a pending authorization of `tenant_pool`'s tenant.
pub struct ProviderCallback<'a> {
    pub pending: &'a PendingAuthorization,
    pub tenant_pool: &'a PgPool,
    pub code: Option<String>,
    /// Records `user.created` / `user.updated` when the login creates or claims an account.
    pub webhooks: &'a WebhookRecorder,
}

impl OAuthLoginContext<'_> {
    /// Exchanges the code (with the PKCE verifier), reads the profile and resolves the user.
    pub async fn finish(&self, callback: ProviderCallback<'_>) -> Result<User, OAuthLoginError> {
        let pending = callback.pending;
        let provider = pending.provider;
        let code = callback.code.ok_or(OAuthLoginError::ProviderDenied)?;
        let access_token = self.exchange_code(pending, code).await?;
        let adapter = ProviderAdapter::select(provider, self.endpoints);
        let profile = adapter.profile(self.http_client, &access_token).await?;
        let key = ProviderKey {
            tenant_id: pending.tenant_id,
            provider,
        };

        if is_current_revision(self.control_plane_pool, key, pending.provider_revision).await?
            == false
        {
            return Err(OAuthLoginError::ProviderChanged);
        }

        let identity = (provider, &profile);

        Ok(resolve_oauth_user(callback.tenant_pool, identity, callback.webhooks).await?)
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
        let (client, revision) = self.client_for(key).await?;

        if revision != pending.provider_revision {
            return Err(OAuthLoginError::ProviderChanged);
        }

        let verifier_context = pkce_verifier_context(pending.tenant_id, pending.provider);
        let verifier_bytes = self
            .secret_box
            .open(&pending.pkce_verifier_ciphertext, &verifier_context)?;
        let verifier =
            String::from_utf8(verifier_bytes).map_err(|_| OAuthLoginError::InvalidVerifier)?;

        // Provider errors may contain the raw response; the callback logs this error.
        client
            .exchange_code(&code, &verifier)
            .await
            .map_err(|_| OAuthLoginError::TokenExchange)
    }
}
