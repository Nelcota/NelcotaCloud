use oauth_providers::{ClientAuthMethod, CodeChallengeMethod, OAuth2Client};
use url::{ParseError, Url};

use crate::modules::oauth::client::oauth_http_client::OAuthHttpClient;
use crate::modules::oauth::provider::oauth_provider_repository::ProviderCredentials;
use crate::modules::oauth::provider::provider_endpoints::ProviderEndpoints;

pub struct ConfiguredOAuthClient {
    client: OAuth2Client,
    authorize_url: Url,
    token_url: Url,
    scopes: &'static [&'static str],
}

impl ConfiguredOAuthClient {
    pub fn authorization_url(&self, state: &str, verifier: &str) -> Url {
        self.client.create_authorization_url_with_pkce(
            &self.authorize_url,
            state,
            CodeChallengeMethod::S256,
            verifier,
            self.scopes,
        )
    }

    pub async fn exchange_code(
        &self,
        code: &str,
        verifier: &str,
    ) -> oauth_providers::Result<String> {
        let tokens = self
            .client
            .validate_authorization_code(&self.token_url, code, Some(verifier))
            .await?;
        tokens.token_type()?;

        Ok(tokens.access_token()?.to_owned())
    }
}

pub struct OAuthClientSettings<'a> {
    pub credentials: ProviderCredentials,
    pub endpoints: &'a ProviderEndpoints,
    pub callback_url: &'a str,
    pub scopes: &'static [&'static str],
    pub http_client: &'a reqwest::Client,
}

pub fn build_oauth_client(
    settings: OAuthClientSettings,
) -> Result<ConfiguredOAuthClient, ParseError> {
    let credentials = settings.credentials;
    let endpoints = settings.endpoints;
    let authorize_url = Url::parse(&endpoints.authorize_url)?;
    let token_url = Url::parse(&endpoints.token_url)?;
    Url::parse(settings.callback_url)?;

    let client = OAuth2Client::new(
        credentials.client_id,
        Some(&credentials.client_secret),
        Some(settings.callback_url),
    )
    // Google and GitHub both accept credentials in the body; GitHub documents only that form.
    .with_auth_method(ClientAuthMethod::Post)
    .with_http_client(OAuthHttpClient::new(settings.http_client.clone()));

    Ok(ConfiguredOAuthClient {
        client,
        authorize_url,
        token_url,
        scopes: settings.scopes,
    })
}
