use std::net::{IpAddr, SocketAddr};

use axum::extract::{ConnectInfo, FromRequestParts};
use axum::http::request::Parts;
use axum::http::{HeaderMap, HeaderName};

use crate::app_state::AppState;
use crate::http::api_error::ApiError;

/// The client's IP. Without `CLIENT_IP_HEADER` it is the TCP peer; with it (e.g.
/// `cf-connecting-ip` behind Cloudflare) the header set by the proxy is trusted instead.
pub struct ClientIp(pub IpAddr);

impl FromRequestParts<AppState> for ClientIp {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
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
}

/// A request without the proxy header did not come through the proxy, so it is rejected.
fn client_ip_from_header(
    headers: &HeaderMap,
    header_name: &HeaderName,
) -> Result<ClientIp, ApiError> {
    let missing_header =
        || ApiError::InvalidRequest(format!("missing or invalid {header_name} header"));
    let Some(header_value) = headers.get(header_name) else {
        return Err(missing_header());
    };
    let header_text = header_value.to_str().map_err(|_| missing_header())?;
    // X-Forwarded-For style lists put the original client first.
    let Some(first_address) = header_text.split(',').next() else {
        return Err(missing_header());
    };
    let client_ip = first_address
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
    fn reads_the_first_address_of_the_header() -> Result<(), ApiError> {
        let mut headers = HeaderMap::new();
        headers.insert(HEADER, HeaderValue::from_static("203.0.113.7, 10.0.0.1"));

        let ClientIp(client_ip) = client_ip_from_header(&headers, &HEADER)?;

        assert_eq!(client_ip.to_string(), "203.0.113.7");
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
