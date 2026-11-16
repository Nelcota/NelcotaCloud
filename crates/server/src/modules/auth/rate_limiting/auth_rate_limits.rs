use std::time::Duration;

use crate::modules::auth::rate_limiting::attempt_limiter::{
    AttemptLimiter, InvalidQuota, QuotaSpec,
};

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

/// The limits of every Auth action. In memory: enough for a single instance; they reset when
/// the server restarts.
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

    pub fn forget_idle_keys(&self) {
        self.login.forget_idle_keys();
        self.email_delivery.forget_idle_keys();
    }
}
