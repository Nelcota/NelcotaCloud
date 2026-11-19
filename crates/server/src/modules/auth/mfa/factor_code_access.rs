use crate::shared::crypto::secret_box::SecretBox;
use crate::shared::rate_limiting::attempt_limiter::AttemptLimiter;

pub struct FactorCodeAccess<'a> {
    pub limiter: &'a AttemptLimiter,
    pub secret_box: &'a SecretBox,
}
