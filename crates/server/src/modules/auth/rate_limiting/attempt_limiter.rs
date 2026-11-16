use std::net::IpAddr;

use governor::{DefaultKeyedRateLimiter, RateLimiter};
use uuid::Uuid;

use crate::modules::auth::rate_limiting::client_ip_limiter::ClientIpLimiter;
use crate::modules::auth::rate_limiting::quota_spec::{AttemptRejected, InvalidQuota, QuotaSpec};

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
struct EmailKey {
    tenant_id: Uuid,
    email: String,
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
    by_email: DefaultKeyedRateLimiter<EmailKey>,
    by_client_ip: ClientIpLimiter,
}

impl AttemptLimiter {
    pub fn new(per_email: &QuotaSpec, per_client_ip: &QuotaSpec) -> Result<Self, InvalidQuota> {
        Ok(Self {
            by_email: RateLimiter::keyed(per_email.to_quota()?),
            by_client_ip: ClientIpLimiter::new(per_client_ip)?,
        })
    }

    /// The IP limit is checked first: a client over it does not even cost an email key.
    pub fn check(&self, attempt: &Attempt) -> Result<(), AttemptRejected> {
        let tenant_id = attempt.tenant_id;
        self.by_client_ip.check(tenant_id, attempt.client_ip)?;
        let email_key = EmailKey {
            tenant_id,
            email: attempt.email.trim().to_lowercase(),
        };

        if self.by_email.check_key(&email_key).is_err() {
            return Err(AttemptRejected);
        }

        Ok(())
    }

    /// Drops keys whose limit has fully replenished, so memory does not grow with every email seen.
    pub fn forget_idle_keys(&self) {
        self.by_email.retain_recent();
        self.by_email.shrink_to_fit();
        self.by_client_ip.forget_idle_keys();
    }
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;
    use std::time::Duration;

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
    fn rejects_zero_burst() {
        let zero_burst = QuotaSpec {
            burst: 0,
            replenish_every: Duration::from_secs(1),
        };

        assert!(AttemptLimiter::new(&zero_burst, &PER_CLIENT_IP).is_err());
    }
}
