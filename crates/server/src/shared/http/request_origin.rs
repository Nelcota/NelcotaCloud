use std::net::IpAddr;

use axum::extract::{FromRef, FromRequestParts};
use axum::http::request::Parts;
use axum::http::{HeaderMap, HeaderName, header::USER_AGENT};

use crate::shared::http::api_error::ApiError;
use crate::shared::http::client_ip::{ClientIp, ClientIpSource};
use crate::shared::http::request_id::REQUEST_ID_HEADER;

/// Longer user agents are cut: the text is shown, never parsed for decisions.
const MAX_USER_AGENT_CHARS: usize = 512;

/// Where a request came from: the client's IP, its user agent and the id the server gave it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestOrigin {
    pub client_ip: IpAddr,
    /// As sent by the client, so only a description, never proof of anything.
    pub user_agent: Option<String>,
    /// Set by the server on every request (see `request_id`), so it can be trusted.
    pub request_id: Option<String>,
}

impl<S> FromRequestParts<S> for RequestOrigin
where
    S: Send + Sync,
    ClientIpSource: FromRef<S>,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, ApiError> {
        let ClientIp(client_ip) = ClientIp::from_request_parts(parts, state).await?;
        let headers = &parts.headers;

        Ok(Self {
            client_ip,
            user_agent: header_text(headers, &USER_AGENT).map(shorten),
            request_id: header_text(headers, &REQUEST_ID_HEADER),
        })
    }
}

impl RequestOrigin {
    /// An origin known only by its IP, for code paths that never saw the request headers.
    pub fn from_ip(client_ip: IpAddr) -> Self {
        Self {
            client_ip,
            user_agent: None,
            request_id: None,
        }
    }
}

/// The header's text when present, readable and not blank.
fn header_text(headers: &HeaderMap, name: &HeaderName) -> Option<String> {
    let text = headers.get(name)?.to_str().ok()?.trim();

    if text.is_empty() {
        return None;
    }

    Some(text.to_owned())
}

fn shorten(text: String) -> String {
    if text.chars().count() <= MAX_USER_AGENT_CHARS {
        return text;
    }

    text.chars().take(MAX_USER_AGENT_CHARS).collect()
}

#[cfg(test)]
mod tests {
    use axum::http::HeaderValue;

    use super::*;

    #[test]
    fn reads_present_headers_and_skips_blank_ones() {
        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static("  Mozilla/5.0  "));
        headers.insert(REQUEST_ID_HEADER, HeaderValue::from_static(" "));

        assert_eq!(
            header_text(&headers, &USER_AGENT).as_deref(),
            Some("Mozilla/5.0")
        );
        assert_eq!(header_text(&headers, &REQUEST_ID_HEADER), None);
    }

    #[test]
    fn skips_missing_or_unreadable_headers() -> Result<(), Box<dyn std::error::Error>> {
        let mut headers = HeaderMap::new();
        assert_eq!(header_text(&headers, &USER_AGENT), None);

        headers.insert(USER_AGENT, HeaderValue::from_bytes(b"caf\xe9")?);
        assert_eq!(header_text(&headers, &USER_AGENT), None);
        Ok(())
    }

    #[test]
    fn cuts_long_user_agents_on_a_character_boundary() {
        let long = "é".repeat(MAX_USER_AGENT_CHARS + 10);
        let short = shorten(long);

        assert_eq!(short.chars().count(), MAX_USER_AGENT_CHARS);
        assert_eq!(shorten("curl/8".to_owned()), "curl/8");
    }
}
