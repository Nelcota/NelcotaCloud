use std::net::IpAddr;

use governor::{DefaultKeyedRateLimiter, RateLimiter};
use uuid::Uuid;

use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rate_limiting::client_ip_limiter::{ClientIpLimiter, client_network};
use crate::modules::auth::rate_limiting::quota_spec::{AttemptRejected, InvalidQuota, QuotaSpec};

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
struct EmailFromNetworkKey {
    tenant_id: Uuid,
    email: String,
    network: IpAddr,
}

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
struct EmailKey {
    tenant_id: Uuid,
    email: String,
}

/// The three quotas of password logins.
pub struct LoginQuotas<'a> {
    /// Guessing one account's password from one network.
    pub per_email_from_network: &'a QuotaSpec,
    /// Guessing one account's password from anywhere (distributed guessing); looser, so other
    /// networks cannot lock the owner out with a few wrong passwords.
    pub per_email: &'a QuotaSpec,
    /// One network spraying many accounts.
    pub per_client_ip: &'a QuotaSpec,
}

/// Limits password logins. A strict limit per (account, network) and a loose one per account,
/// so an attacker sending wrong passwords from other addresses cannot keep the owner out.
pub struct LoginLimiter {
    per_email_from_network: DefaultKeyedRateLimiter<EmailFromNetworkKey>,
    per_email: DefaultKeyedRateLimiter<EmailKey>,
    by_client_ip: ClientIpLimiter,
}

impl LoginLimiter {
    pub fn new(quotas: &LoginQuotas) -> Result<Self, InvalidQuota> {
        Ok(Self {
            per_email_from_network: RateLimiter::keyed(quotas.per_email_from_network.to_quota()?),
            per_email: RateLimiter::keyed(quotas.per_email.to_quota()?),
            by_client_ip: ClientIpLimiter::new(quotas.per_client_ip)?,
        })
    }

    pub fn check(&self, attempt: &Attempt) -> Result<(), AttemptRejected> {
        let tenant_id = attempt.tenant_id;
        let email = attempt.email.trim().to_lowercase();
        self.by_client_ip.check(tenant_id, attempt.client_ip)?;
        let from_network = EmailFromNetworkKey {
            tenant_id,
            email: email.clone(),
            network: client_network(attempt.client_ip),
        };
        self.per_email_from_network
            .check_key(&from_network)
            .map_err(|not_until| AttemptRejected::waiting(&not_until))?;

        self.per_email
            .check_key(&EmailKey { tenant_id, email })
            .map_err(|not_until| AttemptRejected::waiting(&not_until))
    }

    pub fn forget_idle_keys(&self) {
        self.per_email_from_network.retain_recent();
        self.per_email_from_network.shrink_to_fit();
        self.per_email.retain_recent();
        self.per_email.shrink_to_fit();
        self.by_client_ip.forget_idle_keys();
    }
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;
    use std::time::Duration;

    use super::*;

    const STRICT: QuotaSpec = QuotaSpec {
        burst: 2,
        replenish_every: Duration::from_secs(300),
    };
    const LOOSE: QuotaSpec = QuotaSpec {
        burst: 5,
        replenish_every: Duration::from_secs(300),
    };
    const PER_IP: QuotaSpec = QuotaSpec {
        burst: 100,
        replenish_every: Duration::from_secs(300),
    };

    fn attempt(tenant_id: Uuid, last_octet: u8) -> Attempt<'static> {
        Attempt {
            tenant_id,
            email: "ana@example.com",
            client_ip: IpAddr::V4(Ipv4Addr::new(203, 0, 113, last_octet)),
        }
    }

    #[test]
    fn other_networks_cannot_lock_the_owner_out() -> Result<(), InvalidQuota> {
        let limiter = LoginLimiter::new(&LoginQuotas {
            per_email_from_network: &STRICT,
            per_email: &LOOSE,
            per_client_ip: &PER_IP,
        })?;
        let tenant_id = Uuid::new_v4();

        for _ in 0..STRICT.burst {
            assert!(limiter.check(&attempt(tenant_id, 1)).is_ok());
        }

        assert!(limiter.check(&attempt(tenant_id, 1)).is_err());
        assert!(limiter.check(&attempt(tenant_id, 2)).is_ok());
        Ok(())
    }

    #[test]
    fn distributed_guessing_still_hits_the_account_limit() -> Result<(), InvalidQuota> {
        let limiter = LoginLimiter::new(&LoginQuotas {
            per_email_from_network: &STRICT,
            per_email: &LOOSE,
            per_client_ip: &PER_IP,
        })?;
        let tenant_id = Uuid::new_v4();
        let mut accepted = 0;

        for network in 1..=20 {
            if limiter.check(&attempt(tenant_id, network)).is_ok() {
                accepted += 1;
            }
        }

        assert_eq!(accepted, LOOSE.burst);
        Ok(())
    }
}
