use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

use tokio::net::lookup_host;

use crate::modules::tenants::smtp::smtp_endpoint::{SmtpEndpoint, SmtpTlsMode};

/// Ports SMTP servers listen on; any other port is refused, so a tenant cannot point the API
/// at a database or an internal HTTP service.
const ALLOWED_SMTP_PORTS: [u16; 4] = [25, 465, 587, 2525];
const LOCAL_NAME_SUFFIXES: [&str; 4] = [".local", ".localhost", ".internal", ".lan"];

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

    check_host_name(&endpoint.host.to_ascii_lowercase())
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
    if let Ok(ip) = host.parse::<IpAddr>() {
        return public_ip_only(ip);
    }

    // Single-label names ("postgres", "api") are container and intranet hosts.
    if host.contains('.') == false || host == "localhost" {
        return Err(SmtpHostPolicyError::PrivateHost);
    }

    if LOCAL_NAME_SUFFIXES
        .iter()
        .any(|suffix| host.ends_with(suffix))
    {
        return Err(SmtpHostPolicyError::PrivateHost);
    }

    Ok(())
}

fn public_ip_only(ip: IpAddr) -> Result<(), SmtpHostPolicyError> {
    if is_public_ip(ip) == false {
        return Err(SmtpHostPolicyError::PrivateHost);
    }

    Ok(())
}

fn is_public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_public_ipv4(v4),
        IpAddr::V6(v6) => is_public_ipv6(v6),
    }
}

/// 100.64.0.0/10 (carrier-grade NAT) and 0.0.0.0/8 are not covered by the std helpers.
fn is_public_ipv4(ip: Ipv4Addr) -> bool {
    let [first, second, third, _] = ip.octets();

    (ip.is_private()
        || ip.is_loopback()
        || ip.is_link_local()
        || ip.is_broadcast()
        || ip.is_documentation()
        || ip.is_unspecified()
        || ip.is_multicast()
        || (first == 100 && (64..=127).contains(&second))
        || first == 0
        || (first == 192 && second == 0 && third == 0)
        || (first == 192 && second == 88 && third == 99)
        || (first == 198 && (second == 18 || second == 19))
        || first >= 240)
        == false
}

/// Allow only ordinary global unicast space; mapped IPv4 follows the IPv4 rules.
fn is_public_ipv6(ip: Ipv6Addr) -> bool {
    if let Some(v4) = ip.to_ipv4_mapped() {
        return is_public_ipv4(v4);
    }

    let [first_segment, second_segment, ..] = ip.segments();

    ((first_segment & 0xe000) != 0x2000
        || first_segment == 0x2001 && second_segment <= 0x01ff
        || first_segment == 0x2001 && second_segment == 0x0db8
        || first_segment == 0x2001 && second_segment == 0x0020
        || first_segment == 0x2002
        || first_segment == 0x3fff)
        == false
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
