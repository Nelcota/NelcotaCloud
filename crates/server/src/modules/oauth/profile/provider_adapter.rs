use crate::modules::oauth::profile::github_profile::fetch_github_profile;
use crate::modules::oauth::profile::google_profile::fetch_google_profile;
use crate::modules::oauth::profile::provider_profile::{
    ProfileError, ProfileRequest, ProviderProfile,
};
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::provider::provider_endpoints::{OAuthEndpoints, ProviderEndpoints};

/// A provider's token endpoints and its normalized profile lookup travel together.
pub(in crate::modules::oauth) enum ProviderAdapter<'a> {
    Google(&'a ProviderEndpoints),
    GitHub(&'a ProviderEndpoints),
}

impl<'a> ProviderAdapter<'a> {
    pub fn select(provider: OAuthProvider, endpoints: &'a OAuthEndpoints) -> Self {
        match provider {
            OAuthProvider::Google => Self::Google(&endpoints.google),
            OAuthProvider::GitHub => Self::GitHub(&endpoints.github),
        }
    }

    pub fn endpoints(&self) -> &'a ProviderEndpoints {
        match self {
            Self::Google(endpoints) | Self::GitHub(endpoints) => endpoints,
        }
    }

    pub async fn profile(
        &self,
        http_client: &reqwest::Client,
        access_token: &str,
    ) -> Result<ProviderProfile, ProfileError> {
        let request = ProfileRequest {
            http_client,
            endpoints: self.endpoints(),
            access_token,
        };

        match self {
            Self::Google(_) => fetch_google_profile(&request).await,
            Self::GitHub(_) => fetch_github_profile(&request).await,
        }
    }
}
