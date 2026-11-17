use governor::{DefaultKeyedRateLimiter, RateLimiter};

use crate::modules::auth::rate_limiting::quota_spec::{AttemptRejected, InvalidQuota, QuotaSpec};

/// Limits emails to one address across every project, so nobody can flood an inbox by
/// spreading requests over many projects (each has its own per-address limit too).
pub struct RecipientLimiter {
    limiter: DefaultKeyedRateLimiter<String>,
}

impl RecipientLimiter {
    pub fn new(quota: &QuotaSpec) -> Result<Self, InvalidQuota> {
        Ok(Self {
            limiter: RateLimiter::keyed(quota.to_quota()?),
        })
    }

    pub fn check(&self, email: &str) -> Result<(), AttemptRejected> {
        self.limiter
            .check_key(&email.trim().to_lowercase())
            .map_err(|not_until| AttemptRejected::waiting(&not_until))
    }

    pub fn forget_idle_keys(&self) {
        self.limiter.retain_recent();
        self.limiter.shrink_to_fit();
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::*;

    #[test]
    fn counts_one_address_whatever_its_case() -> Result<(), InvalidQuota> {
        let limiter = RecipientLimiter::new(&QuotaSpec {
            burst: 1,
            replenish_every: Duration::from_secs(600),
        })?;

        assert!(limiter.check("ana@example.com").is_ok());
        assert!(limiter.check(" ANA@example.com").is_err());
        assert!(limiter.check("bia@example.com").is_ok());
        Ok(())
    }
}
