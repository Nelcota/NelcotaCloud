use std::num::NonZeroU32;
use std::time::Duration;

use governor::Quota;

use crate::shared::http::api_error::ApiError;

#[derive(Debug, thiserror::Error)]
#[error("rate limit quotas must have a positive burst and period")]
pub struct InvalidQuota;

#[derive(Debug, thiserror::Error)]
#[error("too many attempts")]
pub struct AttemptRejected;

impl From<AttemptRejected> for ApiError {
    fn from(_: AttemptRejected) -> Self {
        Self::RateLimited
    }
}

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

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use super::*;

    #[test]
    fn a_rejected_attempt_answers_too_many_requests() {
        let response = ApiError::from(AttemptRejected).into_response();

        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    }
}
