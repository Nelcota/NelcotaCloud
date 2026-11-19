use uuid::Uuid;

use crate::modules::auth::rate_limiting::rate_limit_quotas::{
    EMAIL_PER_ADDRESS, EMAIL_PER_CLIENT_IP, EMAIL_PER_PROJECT, EMAIL_PER_RECIPIENT,
};
use crate::shared::rate_limiting::account_limiter::AccountLimiter;
use crate::shared::rate_limiting::attempt_limiter::{Attempt, AttemptLimiter};
use crate::shared::rate_limiting::quota_spec::{AttemptRejected, InvalidQuota};
use crate::shared::rate_limiting::recipient_limiter::RecipientLimiter;

pub struct EmailLimiter {
    delivery: AttemptLimiter,
    recipient: RecipientLimiter,
    project: AccountLimiter,
}

impl EmailLimiter {
    pub fn new() -> Result<Self, InvalidQuota> {
        Ok(Self {
            delivery: AttemptLimiter::new(&EMAIL_PER_ADDRESS, &EMAIL_PER_CLIENT_IP)?,
            recipient: RecipientLimiter::new(&EMAIL_PER_RECIPIENT)?,
            project: AccountLimiter::new(&EMAIL_PER_PROJECT)?,
        })
    }

    pub fn check(&self, attempt: &Attempt<'_>) -> Result<(), AttemptRejected> {
        self.delivery.check(attempt)?;
        self.recipient.check(attempt.email)?;

        self.project.check(attempt.tenant_id, Uuid::nil())
    }

    pub fn forget_idle_keys(&self) {
        self.delivery.forget_idle_keys();
        self.recipient.forget_idle_keys();
        self.project.forget_idle_keys();
    }
}
