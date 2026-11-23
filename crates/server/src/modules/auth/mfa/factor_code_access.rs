use crate::modules::auth::rate_limiting::shared_auth_limits::SharedAuthLimits;
use crate::shared::crypto::secret_box::SecretBox;

pub struct FactorCodeAccess<'a> {
    pub limiter: &'a SharedAuthLimits,
    pub secret_box: &'a SecretBox,
}
