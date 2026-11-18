use serde::{Deserialize, Serialize};

/// Turnstile's answer to a secret key it does not know.
pub const INVALID_SECRET_ERROR: &str = "invalid-input-secret";

/// What Cloudflare's `siteverify` is asked about one token.
#[derive(Serialize)]
pub struct SiteVerifyRequest<'a> {
    pub secret: &'a str,
    pub response: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remoteip: Option<String>,
}

/// The part of `siteverify`'s answer this API uses.
#[derive(Debug, Deserialize)]
pub struct SiteVerifyOutcome {
    pub success: bool,
    #[serde(rename = "error-codes", default)]
    pub error_codes: Vec<String>,
}

impl SiteVerifyOutcome {
    pub fn has_invalid_secret(&self) -> bool {
        self.error_codes
            .iter()
            .any(|code| code == INVALID_SECRET_ERROR)
    }
}

/// Where tokens are checked: Cloudflare's endpoint, or a fake one in tests.
pub struct SiteVerifier<'a> {
    pub http_client: &'a reqwest::Client,
    pub verify_url: &'a str,
}

impl SiteVerifier<'_> {
    /// Cloudflare answers refused tokens and unknown secrets with a 4xx and the reason in the
    /// body, so only a 5xx (or no answer) means the check itself failed.
    pub async fn verify(
        &self,
        request: &SiteVerifyRequest<'_>,
    ) -> Result<SiteVerifyOutcome, reqwest::Error> {
        let response = self
            .http_client
            .post(self.verify_url)
            .json(request)
            .send()
            .await?;

        if response.status().is_server_error() {
            response.error_for_status_ref()?;
        }

        response.json().await
    }
}
