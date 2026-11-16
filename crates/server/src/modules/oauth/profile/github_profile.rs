use serde::Deserialize;

use crate::modules::oauth::profile::provider_profile::{
    ProfileError, ProfileRequest, ProviderProfile, get_json,
};

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

/// GitHub's `/user` may hide the email, so the verified primary one comes from `/user/emails`.
pub(super) async fn fetch_github_profile(
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
