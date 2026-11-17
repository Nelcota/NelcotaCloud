use reqwest::header::{ACCEPT, USER_AGENT};
use serde::de::DeserializeOwned;

use crate::modules::oauth::profile::github_profile::fetch_github_profile;
use crate::modules::oauth::profile::google_profile::fetch_google_profile;
use crate::modules::oauth::profile::provider_url::{InsecureProviderUrl, secure_provider_url};
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::provider::provider_endpoints::ProviderEndpoints;

/// GitHub rejects API requests without a User-Agent.
const CLIENT_USER_AGENT: &str = "NelcotaCloud";
const JSON_MEDIA_TYPE: &str = "application/json";

#[derive(Debug, thiserror::Error)]
pub enum ProfileError {
    #[error("failed to read the provider profile: {0}")]
    Request(#[from] reqwest::Error),
    #[error("provider returned an empty user id")]
    MissingUserId,
    #[error(transparent)]
    InsecureUrl(#[from] InsecureProviderUrl),
}

/// What we keep from the provider: its stable user id, and the email only if it is verified.
#[derive(Debug, Clone)]
pub struct ProviderProfile {
    pub provider_user_id: String,
    pub verified_email: Option<String>,
}

pub struct ProfileRequest<'a> {
    pub http_client: &'a reqwest::Client,
    pub endpoints: &'a ProviderEndpoints,
    pub access_token: &'a str,
}

pub async fn fetch_profile(
    provider: OAuthProvider,
    request: &ProfileRequest<'_>,
) -> Result<ProviderProfile, ProfileError> {
    match provider {
        OAuthProvider::Google => fetch_google_profile(request).await,
        OAuthProvider::GitHub => fetch_github_profile(request).await,
    }
}

/// An authenticated GET to the provider API. The typed `T` validates the response shape.
pub(super) async fn get_json<T: DeserializeOwned>(
    request: &ProfileRequest<'_>,
    url: &str,
) -> Result<T, ProfileError> {
    let url = secure_provider_url(url)?;
    let response = request
        .http_client
        .get(url)
        .bearer_auth(request.access_token)
        .header(USER_AGENT, CLIENT_USER_AGENT)
        .header(ACCEPT, JSON_MEDIA_TYPE)
        .send()
        .await?
        .error_for_status()?;

    Ok(response.json().await?)
}
