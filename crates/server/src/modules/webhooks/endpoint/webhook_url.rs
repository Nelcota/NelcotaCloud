use reqwest::Url;

use crate::shared::net::public_host::is_public_host_name;

const MAX_URL_LENGTH: usize = 2048;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum WebhookUrlError {
    #[error("the webhook URL is not a valid absolute URL")]
    Malformed,
    #[error("the webhook URL is longer than 2048 characters")]
    TooLong,
    #[error("the webhook URL must use https")]
    HttpsRequired,
    #[error("the webhook URL must not carry a user name or password")]
    CredentialsNotAllowed,
    #[error("the webhook URL must point to a public host")]
    PrivateHost,
}

/// Where the webhook host policy stands: production refuses private hosts and plain http.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WebhookHostPolicy {
    PublicHttpsOnly,
    /// Development and tests only (`WEBHOOK_ALLOW_PRIVATE_HOSTS`): local receivers over http.
    AllowPrivate,
}

/// A receiver URL the API may call: https, on a public host, without credentials.
///
/// The host name is checked here, before any DNS lookup; the addresses it resolves to are
/// checked again on every delivery (`PublicResolver`), since DNS answers can change.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WebhookUrl(Url);

impl WebhookUrl {
    pub fn parse(raw: &str, policy: WebhookHostPolicy) -> Result<Self, WebhookUrlError> {
        let raw = raw.trim();

        if raw.len() > MAX_URL_LENGTH {
            return Err(WebhookUrlError::TooLong);
        }

        let url = Url::parse(raw).map_err(|_| WebhookUrlError::Malformed)?;

        // Percent-encoding and punycode can make the stored URL longer than what was typed.
        if url.as_str().len() > MAX_URL_LENGTH {
            return Err(WebhookUrlError::TooLong);
        }

        check_shape(&url, policy)?;

        Ok(Self(url))
    }

    pub fn as_str(&self) -> &str {
        self.0.as_str()
    }
}

fn check_shape(url: &Url, policy: WebhookHostPolicy) -> Result<(), WebhookUrlError> {
    let host = url.host_str().ok_or(WebhookUrlError::Malformed)?;

    if url.username().is_empty() == false || url.password().is_some() {
        return Err(WebhookUrlError::CredentialsNotAllowed);
    }

    if policy == WebhookHostPolicy::AllowPrivate {
        return check_scheme(url, &["https", "http"]);
    }

    check_scheme(url, &["https"])?;

    if is_public_host_name(host) == false {
        return Err(WebhookUrlError::PrivateHost);
    }

    Ok(())
}

fn check_scheme(url: &Url, allowed: &[&str]) -> Result<(), WebhookUrlError> {
    if allowed.contains(&url.scheme()) == false {
        return Err(WebhookUrlError::HttpsRequired);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const PRODUCTION: WebhookHostPolicy = WebhookHostPolicy::PublicHttpsOnly;

    #[test]
    fn accepts_public_https_urls() -> Result<(), WebhookUrlError> {
        let url = WebhookUrl::parse(" https://hooks.example.com/nelcota?x=1 ", PRODUCTION)?;

        assert_eq!(url.as_str(), "https://hooks.example.com/nelcota?x=1");
        Ok(())
    }

    #[test]
    fn refuses_unsafe_urls() {
        let cases = [
            ("not a url", WebhookUrlError::Malformed),
            ("http://hooks.example.com", WebhookUrlError::HttpsRequired),
            ("ftp://hooks.example.com", WebhookUrlError::HttpsRequired),
            (
                "https://user:pass@hooks.example.com",
                WebhookUrlError::CredentialsNotAllowed,
            ),
            ("https://localhost/hook", WebhookUrlError::PrivateHost),
            ("https://10.0.0.8/hook", WebhookUrlError::PrivateHost),
            ("https://[::1]/hook", WebhookUrlError::PrivateHost),
            (
                "https://169.254.169.254/latest",
                WebhookUrlError::PrivateHost,
            ),
            ("https://api.internal/hook", WebhookUrlError::PrivateHost),
            ("https://localhost./hook", WebhookUrlError::PrivateHost),
        ];

        for (raw, expected) in cases {
            assert_eq!(WebhookUrl::parse(raw, PRODUCTION), Err(expected), "{raw}");
        }
    }

    #[test]
    fn refuses_very_long_urls() {
        let raw = format!("https://hooks.example.com/{}", "a".repeat(MAX_URL_LENGTH));

        assert_eq!(
            WebhookUrl::parse(&raw, PRODUCTION),
            Err(WebhookUrlError::TooLong)
        );
    }

    #[test]
    fn development_allows_local_http_receivers() {
        let parsed = WebhookUrl::parse(
            "http://127.0.0.1:9000/hook",
            WebhookHostPolicy::AllowPrivate,
        );

        assert!(parsed.is_ok());
    }

    #[test]
    fn measures_the_length_after_encoding() {
        let spaced_path = "a ".repeat(800);
        let raw = format!("https://hooks.example.com/{spaced_path}");

        assert!(raw.len() <= MAX_URL_LENGTH);
        assert_eq!(
            WebhookUrl::parse(&raw, PRODUCTION),
            Err(WebhookUrlError::TooLong)
        );
    }
}
