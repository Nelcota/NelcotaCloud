use reqwest::header::{ACCEPT, USER_AGENT};
use serde::Deserialize;
use serde::de::DeserializeOwned;

use crate::oauth::oauth_provider::OAuthProvider;
use crate::oauth::provider_endpoints::ProviderEndpoints;

/// GitHub rejects API requests without a User-Agent.
const CLIENT_USER_AGENT: &str = "NelcotaCloud";
const JSON_MEDIA_TYPE: &str = "application/json";

#[derive(Debug, thiserror::Error)]
pub enum ProfileError {
    #[error("failed to read the provider profile: {0}")]
    Request(#[from] reqwest::Error),
    #[error("provider returned an empty user id")]
    MissingUserId,
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

#[derive(Deserialize)]
struct GoogleUserInfo {
    sub: String,
    email: Option<String>,
    email_verified: Option<bool>,
}

#[derive(Deserialize)]
struct GitHubUser {
    id: u64,
}

#[derive(Deserialize)]
struct GitHubEmail {
    email: String,
    primary: bool,
    verified: bool,
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

async fn fetch_google_profile(
    request: &ProfileRequest<'_>,
) -> Result<ProviderProfile, ProfileError> {
    let url = format!("{}/v1/userinfo", request.endpoints.api_base_url);
    let user_info: GoogleUserInfo = get_json(request, &url).await?;

    if user_info.sub.trim().is_empty() {
        return Err(ProfileError::MissingUserId);
    }

    let verified_email = user_info
        .email
        .filter(|_| user_info.email_verified == Some(true));

    Ok(ProviderProfile {
        provider_user_id: user_info.sub,
        verified_email,
    })
}

async fn fetch_github_profile(
    request: &ProfileRequest<'_>,
) -> Result<ProviderProfile, ProfileError> {
    let api_base_url = &request.endpoints.api_base_url;
    let user: GitHubUser = get_json(request, &format!("{api_base_url}/user")).await?;
    let emails: Vec<GitHubEmail> =
        get_json(request, &format!("{api_base_url}/user/emails")).await?;
    let verified_email = emails
        .into_iter()
        .find(|candidate| candidate.primary && candidate.verified)
        .map(|candidate| candidate.email);

    Ok(ProviderProfile {
        provider_user_id: user.id.to_string(),
        verified_email,
    })
}

async fn get_json<T: DeserializeOwned>(
    request: &ProfileRequest<'_>,
    url: &str,
) -> Result<T, ProfileError> {
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
