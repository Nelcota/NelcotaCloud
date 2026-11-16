use std::future::{Future, ready};
use std::net::{IpAddr, SocketAddr};

use axum::extract::{ConnectInfo, FromRequestParts};
use axum::http::request::Parts;
use axum::http::{HeaderMap, HeaderName};

use crate::app_state::AppState;
use crate::shared::http::api_error::ApiError;

/// The client's IP. Without `CLIENT_IP_HEADER` it is the TCP peer; with it (e.g.
/// `cf-connecting-ip` behind Cloudflare) the header set by the proxy is trusted instead.
pub struct ClientIp(pub IpAddr);

impl FromRequestParts<AppState> for ClientIp {
    type Rejection = ApiError;

    /// Nothing to wait for: the IP is read from the request, so the future is already resolved.
    fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> impl Future<Output = Result<Self, ApiError>> + Send {
        ready(resolve_client_ip(parts, state))
    }
}

fn resolve_client_ip(parts: &Parts, state: &AppState) -> Result<ClientIp, ApiError> {
    if let Some(header_name) = &state.settings.client_ip_header {
        return client_ip_from_header(&parts.headers, header_name);
    }

    let Some(ConnectInfo(peer)) = parts.extensions.get::<ConnectInfo<SocketAddr>>() else {
        return Err(ApiError::internal(
            "connection info missing: serve the router with connect info",
        ));
    };

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
    let Some(header_value) = headers.get(header_name) else {
        return Err(missing_header());
    };
    let header_text = header_value.to_str().map_err(|_| missing_header())?;
    // In X-Forwarded-For style lists the client controls every entry but the last one, which
    // the trusted proxy in front of us appended.
    let Some(proxy_seen_address) = header_text.rsplit(',').next() else {
        return Err(missing_header());
    };
    let client_ip = proxy_seen_address
        .trim()
        .parse::<IpAddr>()
        .map_err(|_| missing_header())?;

    Ok(ClientIp(client_ip))
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
}
