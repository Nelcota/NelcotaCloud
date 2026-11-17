use governor::{DefaultKeyedRateLimiter, RateLimiter};
use uuid::Uuid;

use crate::modules::auth::rate_limiting::quota_spec::{AttemptRejected, InvalidQuota, QuotaSpec};

/// Fixed-size key: checking a request allocates nothing.
#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
struct AccountKey {
    tenant_id: Uuid,
    user_id: Uuid,
}

/// Limits an action per (tenant, logged-in user), whatever IP the requests come from.
pub struct AccountLimiter {
    limiter: DefaultKeyedRateLimiter<AccountKey>,
}

impl AccountLimiter {
    pub fn new(quota: &QuotaSpec) -> Result<Self, InvalidQuota> {
        Ok(Self {
            limiter: RateLimiter::keyed(quota.to_quota()?),
        })
    }

    pub fn check(&self, tenant_id: Uuid, user_id: Uuid) -> Result<(), AttemptRejected> {
        let key = AccountKey { tenant_id, user_id };

        if self.limiter.check_key(&key).is_err() {
            return Err(AttemptRejected);
        }

        Ok(())
    }

    /// Drops keys whose limit has fully replenished.
    pub fn forget_idle_keys(&self) {
        self.limiter.retain_recent();
        self.limiter.shrink_to_fit();
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::*;

    const QUOTA: QuotaSpec = QuotaSpec {
        burst: 2,
        replenish_every: Duration::from_secs(300),
    };

    #[test]
    fn limits_each_account_on_its_own() -> Result<(), InvalidQuota> {
        let limiter = AccountLimiter::new(&QUOTA)?;
        let tenant_id = Uuid::new_v4();
        let busy = Uuid::new_v4();

        assert!(limiter.check(tenant_id, busy).is_ok());
        assert!(limiter.check(tenant_id, busy).is_ok());
        assert!(limiter.check(tenant_id, busy).is_err());
        assert!(limiter.check(tenant_id, Uuid::new_v4()).is_ok());
        assert!(limiter.check(Uuid::new_v4(), busy).is_ok());
        Ok(())
    }
}
