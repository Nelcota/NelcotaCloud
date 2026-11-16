use std::net::IpAddr;
use std::num::NonZeroU32;
use std::time::Duration;

use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
use uuid::Uuid;

/// Login: an account tolerates a burst of 10 wrong passwords, then one try every 30 seconds.
const LOGIN_PER_EMAIL: QuotaSpec = QuotaSpec {
    burst: 10,
    replenish_every: Duration::from_secs(30),
};
const LOGIN_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 30,
    replenish_every: Duration::from_secs(2),
};
/// Recovery and verification emails: 3 in a row per address, then one every 5 minutes.
const EMAIL_PER_ADDRESS: QuotaSpec = QuotaSpec {
    burst: 3,
    replenish_every: Duration::from_secs(300),
};
const EMAIL_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 10,
    replenish_every: Duration::from_secs(30),
};

#[derive(Debug, thiserror::Error)]
#[error("rate limit quotas must have a positive burst and period")]
pub struct InvalidQuota;

#[derive(Debug, thiserror::Error)]
#[error("too many attempts")]
pub struct AttemptRejected;

struct QuotaSpec {
    burst: u32,
    replenish_every: Duration,
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
    fn new(per_email: &QuotaSpec, per_client_ip: &QuotaSpec) -> Result<Self, InvalidQuota> {
        Ok(Self {
            by_email: RateLimiter::keyed(per_email.to_quota()?),
            by_client_ip: RateLimiter::keyed(per_client_ip.to_quota()?),
        })
    }

    pub fn check(&self, attempt: &Attempt) -> Result<(), AttemptRejected> {
        let tenant_id = attempt.tenant_id;
        let client_ip_key = LimitKey {
            tenant_id,
            subject: attempt.client_ip.to_string(),
        };
        let email_key = LimitKey {
            tenant_id,
            subject: attempt.email.trim().to_lowercase(),
        };

        if self.by_client_ip.check_key(&client_ip_key).is_err() {
            return Err(AttemptRejected);
        }

        if self.by_email.check_key(&email_key).is_err() {
            return Err(AttemptRejected);
        }

        Ok(())
    }

    fn forget_idle_keys(&self) {
        self.by_email.retain_recent();
        self.by_email.shrink_to_fit();
        self.by_client_ip.retain_recent();
        self.by_client_ip.shrink_to_fit();
    }
}

/// In-memory limits: enough for a single instance; they reset when the server restarts.
pub struct RateLimits {
    pub login: AttemptLimiter,
    pub email_delivery: AttemptLimiter,
}

impl RateLimits {
    pub fn new() -> Result<Self, InvalidQuota> {
        Ok(Self {
            login: AttemptLimiter::new(&LOGIN_PER_EMAIL, &LOGIN_PER_CLIENT_IP)?,
            email_delivery: AttemptLimiter::new(&EMAIL_PER_ADDRESS, &EMAIL_PER_CLIENT_IP)?,
        })
    }

    /// Drops keys whose limit has fully replenished, so memory does not grow with every email seen.
    pub fn forget_idle_keys(&self) {
        self.login.forget_idle_keys();
        self.email_delivery.forget_idle_keys();
    }
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use super::*;

    const CLIENT_IP: IpAddr = IpAddr::V4(Ipv4Addr::LOCALHOST);

    #[test]
    fn rejects_after_the_email_burst() -> Result<(), InvalidQuota> {
        let limits = RateLimits::new()?;
        let tenant_id = Uuid::new_v4();
        let attempt = Attempt {
            tenant_id,
            email: "ana@example.com",
            client_ip: CLIENT_IP,
        };

        for _ in 0..EMAIL_PER_ADDRESS.burst {
            assert!(limits.email_delivery.check(&attempt).is_ok());
        }

        let different_case = Attempt {
            tenant_id,
            email: " ANA@example.com",
            client_ip: CLIENT_IP,
        };
        assert!(limits.email_delivery.check(&different_case).is_err());
        Ok(())
    }

    #[test]
    fn keeps_tenants_and_emails_apart() -> Result<(), InvalidQuota> {
        let limits = RateLimits::new()?;
        let tenant_id = Uuid::new_v4();
        let attempt = Attempt {
            tenant_id,
            email: "ana@example.com",
            client_ip: CLIENT_IP,
        };

        for _ in 0..EMAIL_PER_ADDRESS.burst {
            assert!(limits.email_delivery.check(&attempt).is_ok());
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
        assert!(limits.email_delivery.check(&other_tenant).is_ok());
        assert!(limits.email_delivery.check(&other_email).is_ok());
        Ok(())
    }

    #[test]
    fn rejects_one_client_spraying_many_emails() -> Result<(), InvalidQuota> {
        let limits = RateLimits::new()?;
        let tenant_id = Uuid::new_v4();

        for index in 0..LOGIN_PER_CLIENT_IP.burst {
            let email = format!("user{index}@example.com");
            let attempt = Attempt {
                tenant_id,
                email: &email,
                client_ip: CLIENT_IP,
            };
            assert!(limits.login.check(&attempt).is_ok());
        }

        let attempt = Attempt {
            tenant_id,
            email: "fresh@example.com",
            client_ip: CLIENT_IP,
        };
        assert!(limits.login.check(&attempt).is_err());
        Ok(())
    }
}
