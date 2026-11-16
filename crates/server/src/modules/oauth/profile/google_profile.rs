use serde::Deserialize;

use crate::modules::oauth::profile::provider_profile::{
    ProfileError, ProfileRequest, ProviderProfile, get_json,
};

/// Google OIDC `userinfo` response.
#[derive(Deserialize)]
struct GoogleUserInfo {
    sub: String,
    email: Option<String>,
    email_verified: Option<bool>,
}

pub(super) async fn fetch_google_profile(
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
