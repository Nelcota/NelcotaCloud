use std::net::SocketAddr;

use reqwest::dns::{Addrs, Name, Resolve, Resolving};
use tokio::net::lookup_host;

use crate::modules::webhooks::endpoint::webhook_url::WebhookHostPolicy;
use crate::shared::net::public_host::is_public_ip;

#[derive(Debug, thiserror::Error)]
#[error("webhook host resolves to no public address")]
struct NoPublicAddress;

/// The DNS resolver of the webhook HTTP client: connections only go to public addresses.
///
/// The check and the connection use the same lookup, so a host cannot answer with a public
/// address when saved and a private one when called (DNS rebinding). IP literals in URLs skip
/// DNS; `WebhookUrl` refuses private ones.
pub struct PublicResolver {
    pub policy: WebhookHostPolicy,
}

impl Resolve for PublicResolver {
    fn resolve(&self, name: Name) -> Resolving {
        let host = name.as_str().to_owned();
        let policy = self.policy;

        Box::pin(async move {
            let resolved: Vec<SocketAddr> = lookup_host((host.as_str(), 0)).await?.collect();
            let allowed = allowed_addresses(resolved, policy);

            if allowed.is_empty() {
                return Err(NoPublicAddress.into());
            }

            let addresses: Addrs = Box::new(allowed.into_iter());

            Ok(addresses)
        })
    }
}

fn allowed_addresses(resolved: Vec<SocketAddr>, policy: WebhookHostPolicy) -> Vec<SocketAddr> {
    if policy == WebhookHostPolicy::AllowPrivate {
        return resolved;
    }

    resolved
        .into_iter()
        .filter(|address| is_public_ip(address.ip()))
        .collect()
}

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, Ipv4Addr};

    use super::*;

    fn address(ip: [u8; 4]) -> SocketAddr {
        SocketAddr::new(IpAddr::V4(Ipv4Addr::from(ip)), 0)
    }

    #[test]
    fn drops_private_addresses_in_production() {
        let resolved = vec![address([10, 0, 0, 1]), address([93, 184, 215, 14])];
        let allowed = allowed_addresses(resolved, WebhookHostPolicy::PublicHttpsOnly);

        assert_eq!(allowed, vec![address([93, 184, 215, 14])]);
    }

    #[test]
    fn keeps_every_address_in_development() {
        let resolved = vec![address([127, 0, 0, 1])];
        let allowed = allowed_addresses(resolved.clone(), WebhookHostPolicy::AllowPrivate);

        assert_eq!(allowed, resolved);
    }
}
