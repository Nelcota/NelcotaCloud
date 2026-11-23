use reqwest::StatusCode;
use reqwest::header::{ACCEPT, USER_AGENT};
use serde::de::DeserializeOwned;

use crate::modules::oauth::profile::provider_url::{InsecureProviderUrl, secure_provider_url};
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
    pub needs_email_confirmation: bool,
}

pub struct ProfileRequest<'a> {
    pub http_client: &'a reqwest::Client,
    pub endpoints: &'a ProviderEndpoints,
    pub access_token: &'a str,
}

/// An authenticated GET to the provider API. The typed `T` validates the response shape.
pub(super) async fn get_json<T: DeserializeOwned>(
    request: &ProfileRequest<'_>,
    url: &str,
) -> Result<T, ProfileError> {
    let response = send_get(request, url).await?.error_for_status()?;

    Ok(response.json().await?)
}

/// Like `get_json`, `None` when the provider refuses access to this resource (403, 404): an
/// app registered without that permission still logs in, with what the other calls returned.
pub(super) async fn get_optional_json<T: DeserializeOwned>(
    request: &ProfileRequest<'_>,
    url: &str,
) -> Result<Option<T>, ProfileError> {
    let response = send_get(request, url).await?;
    let status = response.status();

    if status == StatusCode::FORBIDDEN || status == StatusCode::NOT_FOUND {
        return Ok(None);
    }

    Ok(Some(response.error_for_status()?.json().await?))
}

async fn send_get(
    request: &ProfileRequest<'_>,
    url: &str,
) -> Result<reqwest::Response, ProfileError> {
    let url = secure_provider_url(url)?;

    Ok(request
        .http_client
        .get(url)
        .bearer_auth(request.access_token)
        .header(USER_AGENT, CLIENT_USER_AGENT)
        .header(ACCEPT, JSON_MEDIA_TYPE)
        .send()
        .await?)
}
