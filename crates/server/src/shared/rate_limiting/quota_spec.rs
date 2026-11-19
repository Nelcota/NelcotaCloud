use std::num::NonZeroU32;
use std::time::Duration;

use governor::clock::{Clock, DefaultClock, QuantaInstant};
use governor::{NotUntil, Quota};

use crate::shared::http::api_error::ApiError;

#[derive(Debug, thiserror::Error)]
#[error("rate limit quotas must have a positive burst and period")]
pub struct InvalidQuota;

/// A refused attempt, with how long until the next one is allowed.
#[derive(Debug, thiserror::Error)]
#[error("too many attempts")]
pub struct AttemptRejected {
    pub retry_after: Duration,
}

impl AttemptRejected {
    /// From governor's refusal, measured on the clock its limiters use.
    pub fn waiting(not_until: &NotUntil<QuantaInstant>) -> Self {
        Self {
            retry_after: not_until.wait_time_from(DefaultClock::default().now()),
        }
    }
}

impl From<AttemptRejected> for ApiError {
    fn from(rejected: AttemptRejected) -> Self {
        Self::RateLimited(rejected.retry_after)
    }
}

/// `burst` attempts in a row, then one more every `replenish_every`.
pub struct QuotaSpec {
    pub burst: u32,
    pub replenish_every: Duration,
}

impl QuotaSpec {
    pub fn to_quota(&self) -> Result<Quota, InvalidQuota> {
        let burst = NonZeroU32::new(self.burst).ok_or(InvalidQuota)?;
        let quota = Quota::with_period(self.replenish_every).ok_or(InvalidQuota)?;

        Ok(quota.allow_burst(burst))
    }
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use super::*;

    #[test]
    fn a_rejected_attempt_answers_too_many_requests() {
        let rejected = AttemptRejected {
            retry_after: Duration::from_secs(5),
        };
        let response = ApiError::from(rejected).into_response();

        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    }
}
