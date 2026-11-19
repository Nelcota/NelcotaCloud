#[derive(Debug, Clone)]
pub struct ProviderEndpoints {
    pub authorize_url: String,
    pub token_url: String,
    /// Base of the provider API used to read the user's profile.
    pub api_base_url: String,
}

/// Where each provider lives. Production uses the real URLs; tests point them at a fake server.
#[derive(Debug, Clone)]
pub struct OAuthEndpoints {
    pub google: ProviderEndpoints,
    pub github: ProviderEndpoints,
}

impl OAuthEndpoints {
    pub fn production() -> Self {
        Self {
            google: ProviderEndpoints {
                authorize_url: "https://accounts.google.com/o/oauth2/v2/auth".to_owned(),
                token_url: "https://oauth2.googleapis.com/token".to_owned(),
                api_base_url: "https://openidconnect.googleapis.com".to_owned(),
            },
            github: ProviderEndpoints {
                authorize_url: "https://github.com/login/oauth/authorize".to_owned(),
                token_url: "https://github.com/login/oauth/access_token".to_owned(),
                api_base_url: "https://api.github.com".to_owned(),
            },
        }
    }
}
