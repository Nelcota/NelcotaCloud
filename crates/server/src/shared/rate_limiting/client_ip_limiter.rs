use std::net::{IpAddr, Ipv6Addr};

use governor::{DefaultKeyedRateLimiter, RateLimiter};
use uuid::Uuid;

use crate::shared::rate_limiting::quota_spec::{AttemptRejected, InvalidQuota, QuotaSpec};

/// IPv6 clients usually control a whole /64, so it counts as one client.
const IPV6_CLIENT_PREFIX_SEGMENTS: usize = 4;

/// Fixed-size key: checking a request allocates nothing.
#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
struct ClientKey {
    tenant_id: Uuid,
    client: IpAddr,
}

/// Limits an action per (tenant, client IP), against one client spraying many accounts.
pub struct ClientIpLimiter {
    limiter: DefaultKeyedRateLimiter<ClientKey>,
}

impl ClientIpLimiter {
    pub fn new(quota: &QuotaSpec) -> Result<Self, InvalidQuota> {
        Ok(Self {
            limiter: RateLimiter::keyed(quota.to_quota()?),
        })
    }

    pub fn check(&self, tenant_id: Uuid, client_ip: IpAddr) -> Result<(), AttemptRejected> {
        let key = ClientKey {
            tenant_id,
            client: client_network(client_ip),
        };

        self.limiter
            .check_key(&key)
            .map_err(|not_until| AttemptRejected::waiting(&not_until))
    }

    /// Drops keys whose limit has fully replenished.
    pub fn forget_idle_keys(&self) {
        self.limiter.retain_recent();
        self.limiter.shrink_to_fit();
    }
}

/// IPv4 (and IPv4-mapped IPv6) per address; other IPv6 per /64 network.
pub(crate) fn client_network(client_ip: IpAddr) -> IpAddr {
    let address = match client_ip {
        IpAddr::V6(address) => address,
        _ => return client_ip,
    };

    if let Some(ipv4) = address.to_ipv4_mapped() {
        return IpAddr::V4(ipv4);
    }

    let mut segments = address.segments();
    segments
        .iter_mut()
        .skip(IPV6_CLIENT_PREFIX_SEGMENTS)
        .for_each(|segment| *segment = 0);

    IpAddr::V6(Ipv6Addr::from(segments))
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;
    use std::time::Duration;

    use super::*;

    const QUOTA: QuotaSpec = QuotaSpec {
        burst: 5,
        replenish_every: Duration::from_secs(300),
    };

    #[test]
    fn counts_an_ipv6_slash_64_as_one_client() -> Result<(), InvalidQuota> {
        let limiter = ClientIpLimiter::new(&QUOTA)?;
        let tenant_id = Uuid::new_v4();

        for host in 0..u16::try_from(QUOTA.burst).unwrap_or(0) {
            let client_ip = IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 1, 0, 0, 0, host));
            assert!(limiter.check(tenant_id, client_ip).is_ok());
        }

        let same_network = IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 1, 0xffff, 1, 2, 3));
        let other_network = IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 2, 0, 0, 0, 1));
        assert!(limiter.check(tenant_id, same_network).is_err());
        assert!(limiter.check(tenant_id, other_network).is_ok());
        Ok(())
    }

    #[test]
    fn treats_ipv4_mapped_addresses_as_ipv4() {
        let ipv4 = Ipv4Addr::new(203, 0, 113, 7);
        let mapped = IpAddr::V6(ipv4.to_ipv6_mapped());

        assert_eq!(client_network(mapped), IpAddr::V4(ipv4));
    }
}
