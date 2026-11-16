use std::num::NonZeroU32;
use std::time::Duration;

use governor::Quota;

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
    pub fn to_quota(&self) -> Result<Quota, InvalidQuota> {
        let Some(burst) = NonZeroU32::new(self.burst) else {
            return Err(InvalidQuota);
        };
        let Some(quota) = Quota::with_period(self.replenish_every) else {
            return Err(InvalidQuota);
        };

        Ok(quota.allow_burst(burst))
    }
}
