use std::net::IpAddr;

use reqwest::Url;

const SECURE_SCHEME: &str = "https";
const PLAIN_SCHEME: &str = "http";
const LOCALHOST: &str = "localhost";

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("provider API address must use https")]
pub struct InsecureProviderUrl;

/// The provider API address, before the user's provider access token is sent to it: https only.
/// Plain http is accepted on the loopback interface alone, where tests run a fake provider.
pub fn secure_provider_url(raw_url: &str) -> Result<Url, InsecureProviderUrl> {
    let url = Url::parse(raw_url).map_err(|_| InsecureProviderUrl)?;
    let scheme = url.scheme();

    if scheme == SECURE_SCHEME {
        return Ok(url);
    }

    if scheme == PLAIN_SCHEME && is_loopback(&url) {
        return Ok(url);
    }

    Err(InsecureProviderUrl)
}

fn is_loopback(url: &Url) -> bool {
    let Some(host) = url.host_str() else {
        return false;
    };
    let host = host.trim_start_matches('[').trim_end_matches(']');

    if host == LOCALHOST {
        return true;
    }

    host.parse::<IpAddr>()
        .is_ok_and(|address| address.is_loopback())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_https_and_loopback_http() {
        for url in [
            "https://api.github.com/user",
            "http://127.0.0.1:4100/user",
            "http://[::1]:4100/user",
            "http://localhost:4100/user",
        ] {
            assert!(secure_provider_url(url).is_ok(), "{url}");
        }
    }

    #[test]
    fn refuses_plain_http_elsewhere_and_other_schemes() {
        for url in [
            "http://api.github.com/user",
            "http://10.0.0.5/user",
            "ftp://api.github.com",
            "not a url",
        ] {
            assert_eq!(secure_provider_url(url), Err(InsecureProviderUrl), "{url}");
        }
    }
}
