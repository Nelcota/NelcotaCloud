use sqlx::PgPool;

use crate::modules::oauth::client::oauth_client::{
    ConfiguredOAuthClient, OAuthClientSettings, build_oauth_client,
};
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::provider::oauth_provider_repository::{
    ProviderKey, find_provider_credentials,
};
use crate::modules::oauth::provider::provider_endpoints::OAuthEndpoints;
use crate::shared::crypto::secret_box::SecretBox;

/// Everything the OAuth flow needs from the application. The flow's two halves live in
/// `authorization_start` and `authorization_completion`.
pub struct OAuthLoginContext<'a> {
    pub control_plane_pool: &'a PgPool,
    pub secret_box: &'a SecretBox,
    pub http_client: &'a reqwest::Client,
    pub endpoints: &'a OAuthEndpoints,
    pub callback_url: &'a str,
}

impl OAuthLoginContext<'_> {
    /// An oauth2 client built from the tenant's own OAuth app for that provider.
    pub(super) async fn client_for(
        &self,
        key: ProviderKey,
    ) -> Result<ConfiguredOAuthClient, OAuthLoginError> {
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
