use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

const LOCAL_NAME_SUFFIXES: [&str; 4] = [".local", ".localhost", ".internal", ".lan"];

/// Whether a host name or IP literal may be on the public internet, before any DNS lookup.
///
/// Servers the tenants choose (SMTP, webhooks) must stay outside our own network (no SSRF).
/// A name that passes can still resolve to a private address, so resolved addresses are
/// checked again with [`is_public_ip`].
pub fn is_public_host_name(host: &str) -> bool {
    let host = host.trim_start_matches('[').trim_end_matches(']');
    let host = host.to_ascii_lowercase();
    // "localhost." is "localhost": a trailing dot only makes the name fully qualified.
    let host = host.trim_end_matches('.');

    if let Ok(ip) = host.parse::<IpAddr>() {
        return is_public_ip(ip);
    }

    // Resolvers read "127.1" or "0x7f.0.0.1" as IPv4 addresses that `IpAddr` does not parse:
    // a name whose last label is a number is never a public host name.
    if host.rsplit('.').next().is_some_and(is_numeric_label) {
        return false;
    }

    // Single-label names ("postgres", "api") are container and intranet hosts.
    if host.contains('.') == false || host == "localhost" {
        return false;
    }

    LOCAL_NAME_SUFFIXES
        .iter()
        .any(|suffix| host.ends_with(suffix))
        == false
}

/// A decimal ("1") or hexadecimal ("0x7f") label, as IPv4 parts are written.
fn is_numeric_label(label: &str) -> bool {
    if let Some(hex_digits) = label.strip_prefix("0x") {
        return hex_digits
            .chars()
            .all(|character| character.is_ascii_hexdigit());
    }

    label.is_empty() == false && label.chars().all(|character| character.is_ascii_digit())
}

pub fn is_public_ip(ip: IpAddr) -> bool {
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

    #[test]
    fn refuses_internal_names_and_addresses() {
        for host in [
            "postgres",
            "localhost",
            "mail.internal",
            "printer.local",
            "127.0.0.1",
            "10.0.0.5",
            "192.168.1.10",
            "172.16.0.1",
            "169.254.169.254",
            "100.64.0.1",
            "0.0.0.0",
            "::1",
            "[::1]",
            "fd00::1",
            "fe80::1",
            "::ffff:10.0.0.1",
            "localhost.",
            "api.internal.",
            "printer.local.",
            "127.1",
            "10.1",
            "0x7f.0.0.1",
            "",
            ".",
        ] {
            assert!(is_public_host_name(host) == false, "{host}");
        }
    }

    #[test]
    fn accepts_public_names_and_addresses() {
        for host in [
            "smtp.example.com",
            "Hooks.Example.COM",
            "8.8.8.8",
            "2001:4860:4860::8888",
            "[2001:4860:4860::8888]",
            "smtp.example.com.",
            "mail.1password.com",
        ] {
            assert!(is_public_host_name(host), "{host}");
        }
    }
}
