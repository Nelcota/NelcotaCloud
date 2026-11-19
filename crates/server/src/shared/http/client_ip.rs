use std::future::{Future, ready};
use std::net::{IpAddr, SocketAddr};

use axum::extract::{ConnectInfo, FromRef, FromRequestParts};
use axum::http::request::Parts;
use axum::http::{HeaderMap, HeaderName};

use crate::shared::http::api_error::ApiError;

/// The client's IP. Without `CLIENT_IP_HEADER` it is the TCP peer; with it (e.g.
/// `cf-connecting-ip` behind Cloudflare) the header set by the proxy is trusted instead.
pub struct ClientIp(pub IpAddr);

/// The header the trusted proxy sets with the client's IP; `None` reads the TCP peer.
pub struct ClientIpSource(pub Option<HeaderName>);

impl<S> FromRequestParts<S> for ClientIp
where
    S: Send + Sync,
    ClientIpSource: FromRef<S>,
{
    type Rejection = ApiError;

    /// Nothing to wait for: the IP is read from the request, so the future is already resolved.
    fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> impl Future<Output = Result<Self, ApiError>> + Send {
        let ClientIpSource(header_name) = ClientIpSource::from_ref(state);

        ready(resolve_client_ip(parts, header_name.as_ref()))
    }
}

fn resolve_client_ip(
    parts: &Parts,
    header_name: Option<&HeaderName>,
) -> Result<ClientIp, ApiError> {
    if let Some(header_name) = header_name {
        return client_ip_from_header(&parts.headers, header_name);
    }

    let ConnectInfo(peer) = parts
        .extensions
        .get::<ConnectInfo<SocketAddr>>()
        .ok_or_else(|| {
            ApiError::internal("connection info missing: serve the router with connect info")
        })?;

    Ok(ClientIp(peer.ip()))
}

/// A request without the proxy header did not come through the proxy, so it is rejected.
fn client_ip_from_header(
    headers: &HeaderMap,
    header_name: &HeaderName,
) -> Result<ClientIp, ApiError> {
    // Logged because it usually means traffic is bypassing the proxy or the proxy is
    // misconfigured, which operators must notice.
    let missing_header = || {
        tracing::warn!(header = %header_name, "request without a valid trusted client IP header");
        ApiError::InvalidRequest(format!("missing or invalid {header_name} header"))
    };
    let header_value = headers.get(header_name);
    let header_text = header_value.and_then(|value| value.to_str().ok());
    let client_ip = header_text
        .and_then(proxy_seen_address)
        .ok_or_else(missing_header)?;

    Ok(ClientIp(client_ip))
}

/// In X-Forwarded-For style lists the client controls every entry but the last one, which the
/// trusted proxy in front of us appended.
fn proxy_seen_address(header_text: &str) -> Option<IpAddr> {
    let last_entry = header_text.rsplit(',').next()?;

    last_entry.trim().parse::<IpAddr>().ok()
}

#[cfg(test)]
mod tests {
    use axum::http::HeaderValue;

    use super::*;

    const HEADER: HeaderName = HeaderName::from_static("cf-connecting-ip");

    #[test]
    fn reads_the_address_appended_by_the_trusted_proxy() -> Result<(), ApiError> {
        let mut headers = HeaderMap::new();
        // The client forged the first entry; the proxy appended the real peer last.
        headers.insert(HEADER, HeaderValue::from_static("1.2.3.4, 203.0.113.7"));

        let ClientIp(client_ip) = client_ip_from_header(&headers, &HEADER)?;

        assert_eq!(client_ip.to_string(), "203.0.113.7");
        Ok(())
    }

    #[test]
    fn reads_a_single_address() -> Result<(), ApiError> {
        let mut headers = HeaderMap::new();
        headers.insert(HEADER, HeaderValue::from_static(" 2001:db8::1 "));

        let ClientIp(client_ip) = client_ip_from_header(&headers, &HEADER)?;

        assert_eq!(client_ip.to_string(), "2001:db8::1");
        Ok(())
    }

    #[test]
    fn rejects_missing_or_garbage_headers() {
        let mut headers = HeaderMap::new();
        assert!(client_ip_from_header(&headers, &HEADER).is_err());

        headers.insert(HEADER, HeaderValue::from_static("not-an-ip"));
        assert!(client_ip_from_header(&headers, &HEADER).is_err());
    }

    /// An empty last entry means the proxy appended nothing usable: no client IP is trusted.
    #[test]
    fn refuses_a_list_whose_last_entry_is_empty() {
        assert_eq!(proxy_seen_address("203.0.113.7,"), None);
        assert_eq!(proxy_seen_address(""), None);
    }
}
