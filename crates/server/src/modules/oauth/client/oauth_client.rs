use oauth2::basic::BasicClient;
use oauth2::url::ParseError;
use oauth2::{
    AuthType, AuthUrl, ClientId, ClientSecret, EndpointNotSet, EndpointSet, RedirectUrl, TokenUrl,
};

use crate::modules::oauth::provider::oauth_provider_repository::ProviderCredentials;
use crate::modules::oauth::provider::provider_endpoints::ProviderEndpoints;

pub type ConfiguredOAuthClient =
    BasicClient<EndpointSet, EndpointNotSet, EndpointNotSet, EndpointNotSet, EndpointSet>;

pub struct OAuthClientSettings<'a> {
    pub credentials: &'a ProviderCredentials,
    pub endpoints: &'a ProviderEndpoints,
    pub callback_url: &'a str,
}

pub fn build_oauth_client(
    settings: &OAuthClientSettings,
) -> Result<ConfiguredOAuthClient, ParseError> {
    let credentials = settings.credentials;
    let endpoints = settings.endpoints;
    let client = BasicClient::new(ClientId::new(credentials.client_id.clone()))
        .set_client_secret(ClientSecret::new(credentials.client_secret.clone()))
        .set_auth_uri(AuthUrl::new(endpoints.authorize_url.clone())?)
        .set_token_uri(TokenUrl::new(endpoints.token_url.clone())?)
        .set_redirect_uri(RedirectUrl::new(settings.callback_url.to_owned())?)
        // Google and GitHub both accept credentials in the body; GitHub documents only that form.
        .set_auth_type(AuthType::RequestBody);

    Ok(client)
}
