use std::num::NonZeroU32;
use std::time::Duration;

use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
use uuid::Uuid;

use crate::shared::http::api_error::ApiError;

/// Owners test a receiver a few times in a row; more than that would turn the API into a
/// request generator (or port prober) against hosts of their choosing.
const MANUAL_SENDS_BURST: u32 = 10;
const MANUAL_SEND_REPLENISH: Duration = Duration::from_secs(6);

#[derive(Debug, thiserror::Error)]
#[error("the manual webhook send quota is invalid")]
pub struct InvalidSendQuota;

#[derive(Debug, thiserror::Error)]
#[error("too many manual webhook sends")]
pub struct ManualSendRejected;

impl From<ManualSendRejected> for ApiError {
    fn from(_: ManualSendRejected) -> Self {
        Self::RateLimited
    }
}

/// Limits sends an owner triggers by hand (test events, resends) per project. In memory, one
/// small entry per project, like the Auth rate limits.
pub struct ManualSendLimiter {
    limiter: DefaultKeyedRateLimiter<Uuid>,
}

impl ManualSendLimiter {
    pub fn new() -> Result<Self, InvalidSendQuota> {
        let burst = NonZeroU32::new(MANUAL_SENDS_BURST).ok_or(InvalidSendQuota)?;
        let quota = Quota::with_period(MANUAL_SEND_REPLENISH).ok_or(InvalidSendQuota)?;

        Ok(Self {
            limiter: RateLimiter::keyed(quota.allow_burst(burst)),
        })
    }

    pub fn check(&self, tenant_id: Uuid) -> Result<(), ManualSendRejected> {
        if self.limiter.check_key(&tenant_id).is_err() {
            return Err(ManualSendRejected);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_after_the_burst_per_project() -> Result<(), InvalidSendQuota> {
        let limiter = ManualSendLimiter::new()?;
        let busy = Uuid::new_v4();

        for _ in 0..MANUAL_SENDS_BURST {
            assert!(limiter.check(busy).is_ok());
        }

        assert!(limiter.check(busy).is_err());
        assert!(
            limiter.check(Uuid::new_v4()).is_ok(),
            "other projects keep their quota"
        );
        Ok(())
    }
}
