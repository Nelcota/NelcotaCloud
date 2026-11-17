use std::time::Duration;

use crate::modules::auth::rate_limiting::account_limiter::AccountLimiter;
use crate::modules::auth::rate_limiting::attempt_limiter::AttemptLimiter;
use crate::modules::auth::rate_limiting::client_ip_limiter::ClientIpLimiter;
use crate::modules::auth::rate_limiting::quota_spec::{InvalidQuota, QuotaSpec};

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

/// Signup: each one costs an Argon2 run and may send an email.
const SIGNUP_PER_EMAIL: QuotaSpec = QuotaSpec {
    burst: 3,
    replenish_every: Duration::from_secs(300),
};
const SIGNUP_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 10,
    replenish_every: Duration::from_secs(60),
};
/// MFA codes: six digits, so an account gets few guesses before slowing down.
const MFA_PER_ACCOUNT: QuotaSpec = QuotaSpec {
    burst: 5,
    replenish_every: Duration::from_secs(60),
};
const MFA_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 20,
    replenish_every: Duration::from_secs(6),
};
/// Each console project is a new database: a client gets a few, then one every 5 minutes.
const PROJECT_CREATION_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 3,
    replenish_every: Duration::from_secs(300),
};
/// Starting an OAuth login writes a pending authorization to the control plane.
const OAUTH_START_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 20,
    replenish_every: Duration::from_secs(6),
};

/// Profile changes: each one sends a `user.updated` webhook, so an account gets a burst of 20,
/// then one every 3 seconds.
const PROFILE_UPDATE_PER_ACCOUNT: QuotaSpec = QuotaSpec {
    burst: 20,
    replenish_every: Duration::from_secs(3),
};

/// Data API requests of apps (publishable key): a burst of 300, then 20 per second, per client.
/// Bounds what one client can make a project's database do; servers with the secret key and the
/// console are not limited here.
const DATA_API_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 300,
    replenish_every: Duration::from_millis(50),
};

/// The limits of every rate-limited action. In memory: enough for a single instance; they reset when
/// the server restarts.
pub struct RateLimits {
    pub login: AttemptLimiter,
    pub email_delivery: AttemptLimiter,
    pub signup: AttemptLimiter,
    /// Keyed by the account's email, like login.
    pub mfa: AttemptLimiter,
    /// Starting a login carries no email, so it is limited per client IP only.
    pub oauth_authorization: ClientIpLimiter,
    /// Project creation from the console, per client IP across accounts.
    pub project_creation: ClientIpLimiter,
    /// Data API requests with the publishable key, per project and client IP.
    pub data_api: ClientIpLimiter,
    /// A user changing their own profile (`PATCH /user`), per account.
    pub profile_update: AccountLimiter,
}

impl RateLimits {
    pub fn new() -> Result<Self, InvalidQuota> {
        Ok(Self {
            login: AttemptLimiter::new(&LOGIN_PER_EMAIL, &LOGIN_PER_CLIENT_IP)?,
            email_delivery: AttemptLimiter::new(&EMAIL_PER_ADDRESS, &EMAIL_PER_CLIENT_IP)?,
            signup: AttemptLimiter::new(&SIGNUP_PER_EMAIL, &SIGNUP_PER_CLIENT_IP)?,
            mfa: AttemptLimiter::new(&MFA_PER_ACCOUNT, &MFA_PER_CLIENT_IP)?,
            oauth_authorization: ClientIpLimiter::new(&OAUTH_START_PER_CLIENT_IP)?,
            project_creation: ClientIpLimiter::new(&PROJECT_CREATION_PER_CLIENT_IP)?,
            data_api: ClientIpLimiter::new(&DATA_API_PER_CLIENT_IP)?,
            profile_update: AccountLimiter::new(&PROFILE_UPDATE_PER_ACCOUNT)?,
        })
    }

    pub fn forget_idle_keys(&self) {
        self.login.forget_idle_keys();
        self.email_delivery.forget_idle_keys();
        self.signup.forget_idle_keys();
        self.mfa.forget_idle_keys();
        self.oauth_authorization.forget_idle_keys();
        self.project_creation.forget_idle_keys();
        self.data_api.forget_idle_keys();
        self.profile_update.forget_idle_keys();
    }
}
