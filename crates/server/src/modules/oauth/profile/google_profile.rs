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
    hd: Option<String>,
}

pub(super) async fn fetch_google_profile(
    request: &ProfileRequest<'_>,
) -> Result<ProviderProfile, ProfileError> {
    let url = format!("{}/v1/userinfo", request.endpoints.api_base_url);
    let user_info: GoogleUserInfo = get_json(request, &url).await?;

    if user_info.sub.trim().is_empty() {
        return Err(ProfileError::MissingUserId);
    }

    let reported_email = user_info
        .email
        .filter(|_| user_info.email_verified == Some(true))
        .filter(|email| email.trim().is_empty() == false);
    let (verified_email, needs_email_confirmation) = match reported_email {
        Some(email) if is_google_hosted(&email, user_info.hd.as_deref()) => (Some(email), false),
        Some(_) => (None, true),
        None => (None, false),
    };

    Ok(ProviderProfile {
        provider_user_id: user_info.sub,
        verified_email,
        needs_email_confirmation,
    })
}

/// Google can confirm current ownership of Gmail and accounts managed by a hosted domain.
fn is_google_hosted(email: &str, hosted_domain: Option<&str>) -> bool {
    let Some((_, domain)) = email.trim().rsplit_once('@') else {
        return false;
    };

    domain.eq_ignore_ascii_case("gmail.com")
        || hosted_domain
            .is_some_and(|hosted| hosted.is_empty() == false && domain.eq_ignore_ascii_case(hosted))
}
