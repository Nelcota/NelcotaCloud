use std::net::IpAddr;

use tokio::net::lookup_host;

use crate::modules::tenants::smtp::smtp_endpoint::{SmtpEndpoint, SmtpTlsMode};
use crate::shared::net::public_host::{is_public_host_name, is_public_ip};

/// Ports SMTP servers listen on; any other port is refused, so a tenant cannot point the API
/// at a database or an internal HTTP service.
const ALLOWED_SMTP_PORTS: [u16; 4] = [25, 465, 587, 2525];

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum SmtpHostPolicyError {
    #[error("SMTP port {0} is not allowed; use 25, 465, 587 or 2525")]
    PortNotAllowed(u16),
    #[error("SMTP host must be a public host name or address")]
    PrivateHost,
    #[error("SMTP host could not be resolved")]
    UnresolvableHost,
    #[error("SMTP connections must use implicit TLS or required STARTTLS")]
    TlsRequired,
}

/// Keeps tenant-chosen SMTP servers on the public internet (no SSRF into our own network).
///
/// Checked when the tenant saves its settings and again whenever a sender is built, since a
/// host name may later resolve somewhere else.
pub async fn resolve_smtp_endpoint(
    endpoint: &SmtpEndpoint,
    enforce_public_host: bool,
) -> Result<Vec<IpAddr>, SmtpHostPolicyError> {
    if enforce_public_host {
        check_endpoint_shape(endpoint)?;
    }

    let addresses = resolve_addresses(endpoint).await?;

    if enforce_public_host && addresses.iter().copied().all(is_public_ip) == false {
        return Err(SmtpHostPolicyError::PrivateHost);
    }

    Ok(addresses)
}

/// What can be refused before any DNS lookup: the port, the TLS mode and the host name.
fn check_endpoint_shape(endpoint: &SmtpEndpoint) -> Result<(), SmtpHostPolicyError> {
    if ALLOWED_SMTP_PORTS.contains(&endpoint.port) == false {
        return Err(SmtpHostPolicyError::PortNotAllowed(endpoint.port));
    }

    if endpoint.tls_mode == SmtpTlsMode::Plain {
        return Err(SmtpHostPolicyError::TlsRequired);
    }

    check_host_name(&endpoint.host)
}

async fn resolve_addresses(endpoint: &SmtpEndpoint) -> Result<Vec<IpAddr>, SmtpHostPolicyError> {
    let resolved = lookup_host((endpoint.host.as_str(), endpoint.port)).await;
    let addresses: Vec<IpAddr> = resolved
        .map_err(|_| SmtpHostPolicyError::UnresolvableHost)?
        .map(|address| address.ip())
        .collect();

    if addresses.is_empty() {
        return Err(SmtpHostPolicyError::UnresolvableHost);
    }

    Ok(addresses)
}

fn check_host_name(host: &str) -> Result<(), SmtpHostPolicyError> {
    if is_public_host_name(host) == false {
        return Err(SmtpHostPolicyError::PrivateHost);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn endpoint(host: &str, port: u16) -> SmtpEndpoint {
        SmtpEndpoint {
            host: host.to_owned(),
            port,
            tls_mode: SmtpTlsMode::Implicit,
        }
    }

    #[test]
    fn refuses_non_smtp_ports() {
        let result = check_endpoint_shape(&endpoint("smtp.example.com", 5432));

        assert_eq!(result, Err(SmtpHostPolicyError::PortNotAllowed(5432)));
    }

    #[test]
    fn refuses_internal_names_and_addresses() {
        for host in [
            "postgres",
            "localhost",
            "mail.internal",
            "127.0.0.1",
            "10.0.0.5",
            "192.168.1.10",
            "172.16.0.1",
            "169.254.169.254",
            "100.64.0.1",
            "::1",
            "fd00::1",
            "fe80::1",
            "::ffff:10.0.0.1",
        ] {
            let result = check_endpoint_shape(&endpoint(host, 587));

            assert_eq!(result, Err(SmtpHostPolicyError::PrivateHost), "{host}");
        }
    }

    #[test]
    fn accepts_public_hosts() {
        for host in ["smtp.example.com", "8.8.8.8", "2001:4860:4860::8888"] {
            assert_eq!(check_endpoint_shape(&endpoint(host, 465)), Ok(()), "{host}");
        }
    }
}
