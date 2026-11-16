use std::net::{IpAddr, Ipv6Addr};
use std::num::NonZeroU32;
use std::time::Duration;

use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
use uuid::Uuid;

/// IPv6 clients usually control a whole /64, so it counts as one client.
const IPV6_CLIENT_PREFIX_SEGMENTS: usize = 4;

#[derive(Debug, thiserror::Error)]
#[error("rate limit quotas must have a positive burst and period")]
pub struct InvalidQuota;

#[derive(Debug, thiserror::Error)]
#[error("too many attempts")]
pub struct AttemptRejected;

/// `burst` attempts in a row, then one more every `replenish_every`.
pub struct QuotaSpec {
    pub burst: u32,
    pub replenish_every: Duration,
}

impl QuotaSpec {
    fn to_quota(&self) -> Result<Quota, InvalidQuota> {
        let Some(burst) = NonZeroU32::new(self.burst) else {
            return Err(InvalidQuota);
        };
        let Some(quota) = Quota::with_period(self.replenish_every) else {
            return Err(InvalidQuota);
        };

        Ok(quota.allow_burst(burst))
    }
}

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
struct LimitKey {
    tenant_id: Uuid,
    subject: String,
}

/// One attempt at a limited action.
pub struct Attempt<'a> {
    pub tenant_id: Uuid,
    /// The email typed by the client; normalized here so case changes do not bypass the limit.
    pub email: &'a str,
    pub client_ip: IpAddr,
}

/// Limits an action per (tenant, email), against targeted guessing, and per (tenant, client IP),
/// against one client spraying many accounts.
pub struct AttemptLimiter {
    by_email: DefaultKeyedRateLimiter<LimitKey>,
    by_client_ip: DefaultKeyedRateLimiter<LimitKey>,
}

impl AttemptLimiter {
    pub fn new(per_email: &QuotaSpec, per_client_ip: &QuotaSpec) -> Result<Self, InvalidQuota> {
        Ok(Self {
            by_email: RateLimiter::keyed(per_email.to_quota()?),
            by_client_ip: RateLimiter::keyed(per_client_ip.to_quota()?),
        })
    }

    pub fn check(&self, attempt: &Attempt) -> Result<(), AttemptRejected> {
        let tenant_id = attempt.tenant_id;
        let email_key = LimitKey {
            tenant_id,
            subject: attempt.email.trim().to_lowercase(),
        };

        self.check_client_ip(tenant_id, attempt.client_ip)?;

        if self.by_email.check_key(&email_key).is_err() {
            return Err(AttemptRejected);
        }

        Ok(())
    }

    /// For actions not tied to an email (e.g. starting an OAuth login).
    pub fn check_client_ip(
        &self,
        tenant_id: Uuid,
        client_ip: IpAddr,
    ) -> Result<(), AttemptRejected> {
        let client_ip_key = LimitKey {
            tenant_id,
            subject: client_subject(client_ip),
        };

        if self.by_client_ip.check_key(&client_ip_key).is_err() {
            return Err(AttemptRejected);
        }

        Ok(())
    }

    /// Drops keys whose limit has fully replenished, so memory does not grow with every email seen.
    pub fn forget_idle_keys(&self) {
        self.by_email.retain_recent();
        self.by_email.shrink_to_fit();
        self.by_client_ip.retain_recent();
        self.by_client_ip.shrink_to_fit();
    }
}

/// IPv4 (and IPv4-mapped IPv6) per address; other IPv6 per /64 network.
fn client_subject(client_ip: IpAddr) -> String {
    let IpAddr::V6(address) = client_ip else {
        return client_ip.to_string();
    };

    if let Some(ipv4) = address.to_ipv4_mapped() {
        return ipv4.to_string();
    }

    let mut segments = address.segments();
    segments
        .iter_mut()
        .skip(IPV6_CLIENT_PREFIX_SEGMENTS)
        .for_each(|segment| *segment = 0);

    format!("{}/64", Ipv6Addr::from(segments))
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use super::*;

    const CLIENT_IP: IpAddr = IpAddr::V4(Ipv4Addr::LOCALHOST);
    const PER_EMAIL: QuotaSpec = QuotaSpec {
        burst: 3,
        replenish_every: Duration::from_secs(300),
    };
    const PER_CLIENT_IP: QuotaSpec = QuotaSpec {
        burst: 5,
        replenish_every: Duration::from_secs(300),
    };

    #[test]
    fn rejects_after_the_email_burst() -> Result<(), InvalidQuota> {
        let limiter = AttemptLimiter::new(&PER_EMAIL, &PER_CLIENT_IP)?;
        let tenant_id = Uuid::new_v4();
        let attempt = Attempt {
            tenant_id,
            email: "ana@example.com",
            client_ip: CLIENT_IP,
        };

        for _ in 0..PER_EMAIL.burst {
            assert!(limiter.check(&attempt).is_ok());
        }

        let different_case = Attempt {
            tenant_id,
            email: " ANA@example.com",
            client_ip: CLIENT_IP,
        };
        assert!(limiter.check(&different_case).is_err());
        Ok(())
    }

    #[test]
    fn keeps_tenants_and_emails_apart() -> Result<(), InvalidQuota> {
        let limiter = AttemptLimiter::new(&PER_EMAIL, &PER_CLIENT_IP)?;
        let tenant_id = Uuid::new_v4();
        let attempt = Attempt {
            tenant_id,
            email: "ana@example.com",
            client_ip: CLIENT_IP,
        };

        for _ in 0..PER_EMAIL.burst {
            assert!(limiter.check(&attempt).is_ok());
        }

        let other_tenant = Attempt {
            tenant_id: Uuid::new_v4(),
            ..attempt
        };
        let other_email = Attempt {
            tenant_id,
            email: "bob@example.com",
            client_ip: CLIENT_IP,
        };
        assert!(limiter.check(&other_tenant).is_ok());
        assert!(limiter.check(&other_email).is_ok());
        Ok(())
    }

    #[test]
    fn rejects_one_client_spraying_many_emails() -> Result<(), InvalidQuota> {
        let limiter = AttemptLimiter::new(&PER_EMAIL, &PER_CLIENT_IP)?;
        let tenant_id = Uuid::new_v4();

        for index in 0..PER_CLIENT_IP.burst {
            let email = format!("user{index}@example.com");
            let attempt = Attempt {
                tenant_id,
                email: &email,
                client_ip: CLIENT_IP,
            };
            assert!(limiter.check(&attempt).is_ok());
        }

        let attempt = Attempt {
            tenant_id,
            email: "fresh@example.com",
            client_ip: CLIENT_IP,
        };
        assert!(limiter.check(&attempt).is_err());
        Ok(())
    }

    #[test]
    fn counts_an_ipv6_slash_64_as_one_client() -> Result<(), InvalidQuota> {
        let limiter = AttemptLimiter::new(&PER_EMAIL, &PER_CLIENT_IP)?;
        let tenant_id = Uuid::new_v4();

        for index in 0..PER_CLIENT_IP.burst {
            let client_ip = IpAddr::V6(Ipv6Addr::new(
                0x2001,
                0xdb8,
                0,
                1,
                0,
                0,
                0,
                u16::try_from(index).unwrap_or(0),
            ));
            assert!(limiter.check_client_ip(tenant_id, client_ip).is_ok());
        }

        let same_network = IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 1, 0xffff, 1, 2, 3));
        let other_network = IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 2, 0, 0, 0, 1));
        assert!(limiter.check_client_ip(tenant_id, same_network).is_err());
        assert!(limiter.check_client_ip(tenant_id, other_network).is_ok());
        Ok(())
    }

    #[test]
    fn treats_ipv4_mapped_addresses_as_ipv4() {
        let mapped = IpAddr::V6(Ipv4Addr::new(203, 0, 113, 7).to_ipv6_mapped());

        assert_eq!(client_subject(mapped), "203.0.113.7");
    }

    #[test]
    fn rejects_zero_burst() {
        let zero_burst = QuotaSpec {
            burst: 0,
            replenish_every: Duration::from_secs(1),
        };

        assert!(AttemptLimiter::new(&zero_burst, &PER_CLIENT_IP).is_err());
    }
}
