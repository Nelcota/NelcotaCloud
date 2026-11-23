use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use std::time::Duration;

use crate::startup::app_settings_builder::parse_client_ip_header;
use crate::startup::startup_error::StartupError;

pub async fn check_readiness(
    bind_address: &str,
    client_ip_header: Option<&str>,
) -> Result<(), StartupError> {
    let address = probe_address(bind_address)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .build()?;
    let mut request = client.get(format!("http://{address}/ready"));

    if let Some(header) = parse_client_ip_header(client_ip_header)? {
        request = request.header(header, address.ip().to_string());
    }

    let status = request
        .send()
        .await
        .map_err(StartupError::ReadinessProbe)?
        .status();

    if status != reqwest::StatusCode::OK {
        return Err(StartupError::ReadinessStatus(status));
    }

    Ok(())
}

fn probe_address(bind_address: &str) -> Result<SocketAddr, StartupError> {
    let address: SocketAddr = bind_address
        .trim()
        .parse()
        .map_err(|_| StartupError::ReadinessAddress)?;
    let ip = match address.ip() {
        IpAddr::V4(ip) if ip.is_unspecified() => IpAddr::V4(Ipv4Addr::LOCALHOST),
        IpAddr::V6(ip) if ip.is_unspecified() => IpAddr::V6(Ipv6Addr::LOCALHOST),
        ip => ip,
    };

    Ok(SocketAddr::new(ip, address.port()))
}

#[cfg(test)]
mod tests {
    use axum::Router;
    use axum::http::{HeaderMap, StatusCode};
    use axum::routing::get;
    use tokio::net::TcpListener;

    use super::*;

    #[tokio::test]
    async fn probes_the_local_listener_with_the_configured_proxy_header()
    -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await?;
        let address = format!("0.0.0.0:{}", listener.local_addr()?.port());
        let routes = Router::new().route(
            "/ready",
            get(|headers: HeaderMap| async move {
                match headers
                    .get("x-client-ip")
                    .and_then(|header| header.to_str().ok())
                {
                    Some("127.0.0.1") => StatusCode::OK,
                    _ => StatusCode::SERVICE_UNAVAILABLE,
                }
            }),
        );
        let server = tokio::spawn(async move { axum::serve(listener, routes).await });

        check_readiness(&address, Some("X-Client-IP")).await?;
        let unavailable = check_readiness(&address, None).await;
        assert!(matches!(
            unavailable,
            Err(StartupError::ReadinessStatus(
                StatusCode::SERVICE_UNAVAILABLE
            ))
        ));
        server.abort();

        Ok(())
    }
}
