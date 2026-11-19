use std::time::Duration;

use uuid::Uuid;

use crate::modules::auth::rate_limiting::email_limiter::EmailLimiter;
use crate::modules::auth::rate_limiting::login_limiter::{LoginLimiter, LoginQuotas};
use crate::modules::auth::rate_limiting::rate_limit_quotas::{
    AVATAR_CHANGE_PER_ACCOUNT, LOGIN_PER_CLIENT_IP, LOGIN_PER_EMAIL, LOGIN_PER_EMAIL_FROM_NETWORK,
    MFA_PER_ACCOUNT, MFA_PER_CLIENT_IP, PASSWORD_WORK_PER_CLIENT_IP, PROFILE_UPDATE_PER_ACCOUNT,
    SIGNUP_PER_CLIENT_IP, SIGNUP_PER_EMAIL, TOKEN_REDEMPTION_PER_CLIENT_IP,
};
use crate::modules::cache::access::CACHE_PER_PROJECT;
use crate::shared::rate_limiting::account_limiter::AccountLimiter;
use crate::shared::rate_limiting::attempt_limiter::{Attempt, AttemptLimiter};
use crate::shared::rate_limiting::client_ip_limiter::ClientIpLimiter;
use crate::shared::rate_limiting::quota_spec::{AttemptRejected, InvalidQuota, QuotaSpec};

use crate::modules::database::access::rate_limit_quotas::{
    DATA_API_PER_CLIENT_IP, DATA_API_PER_PROJECT,
};
use crate::modules::oauth::login::rate_limit_quotas::OAUTH_START_PER_CLIENT_IP;
use crate::modules::team::invitation::rate_limit_quotas::INVITATIONS_PER_ACCOUNT;
use crate::modules::tenants::provisioning::rate_limit_quotas::{
    PROJECT_CREATION_PER_ACCOUNT, PROJECT_CREATION_PER_CLIENT_IP,
};

/// Every request of one client, whatever the route or project: 2000, then 500 per second.
///
/// The ceiling leaves room for clients calling multiple projects before the global limit applies.
const REQUESTS_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 2_000,
    replenish_every: Duration::from_millis(2),
};

const WEBHOOK_QUEUE_HEALTH_PER_PROJECT: QuotaSpec = QuotaSpec {
    burst: 30,
    replenish_every: Duration::from_secs(1),
};

/// The limits of every rate-limited action.
///
/// Single-instance counters reset when the server restarts. Limiters use a nil ID for unused
/// parts of their keys.
pub struct RateLimits {
    pub login: LoginLimiter,
    /// Argon2 work (login, signup) per client IP, across every project.
    pub password_work: ClientIpLimiter,
    pub email: EmailLimiter,
    /// Invitations per console account.
    pub invitations: AccountLimiter,
    pub signup: AttemptLimiter,
    /// Keyed by the account's email, like login.
    pub mfa: AttemptLimiter,
    /// Starting a login carries no email, so it is limited per client IP only.
    pub oauth_authorization: ClientIpLimiter,
    /// Project creation from the console, per client IP across accounts.
    pub project_creation_per_client_ip: ClientIpLimiter,
    /// Project creation per console account (keyed by the nil project and the account).
    pub project_creation_per_account: AccountLimiter,
    /// Redeeming tokens and codes, per project and client IP.
    pub token_redemption: ClientIpLimiter,
    /// Data API requests with the publishable key, per project and client IP.
    pub data_api_per_client_ip: ClientIpLimiter,
    /// Data API requests with the secret key or from the console, per project.
    pub data_api_per_project: AccountLimiter,
    pub webhook_queue_health: AccountLimiter,
    pub cache_per_project: AccountLimiter,
    /// A user changing their own profile (`PATCH /user`), per account.
    pub profile_update: AccountLimiter,
    /// A user changing their profile photo, per account.
    pub avatar_change: AccountLimiter,
    /// Every request, per client IP across every route and project.
    pub requests_per_client_ip: ClientIpLimiter,
}

impl RateLimits {
    pub fn new() -> Result<Self, InvalidQuota> {
        let login_quotas = LoginQuotas {
            per_email_from_network: &LOGIN_PER_EMAIL_FROM_NETWORK,
            per_email: &LOGIN_PER_EMAIL,
            per_client_ip: &LOGIN_PER_CLIENT_IP,
        };

        Ok(Self {
            login: LoginLimiter::new(&login_quotas)?,
            password_work: ClientIpLimiter::new(&PASSWORD_WORK_PER_CLIENT_IP)?,
            email: EmailLimiter::new()?,
            invitations: AccountLimiter::new(&INVITATIONS_PER_ACCOUNT)?,
            signup: AttemptLimiter::new(&SIGNUP_PER_EMAIL, &SIGNUP_PER_CLIENT_IP)?,
            mfa: AttemptLimiter::new(&MFA_PER_ACCOUNT, &MFA_PER_CLIENT_IP)?,
            oauth_authorization: ClientIpLimiter::new(&OAUTH_START_PER_CLIENT_IP)?,
            project_creation_per_client_ip: ClientIpLimiter::new(&PROJECT_CREATION_PER_CLIENT_IP)?,
            project_creation_per_account: AccountLimiter::new(&PROJECT_CREATION_PER_ACCOUNT)?,
            token_redemption: ClientIpLimiter::new(&TOKEN_REDEMPTION_PER_CLIENT_IP)?,
            data_api_per_client_ip: ClientIpLimiter::new(&DATA_API_PER_CLIENT_IP)?,
            data_api_per_project: AccountLimiter::new(&DATA_API_PER_PROJECT)?,
            webhook_queue_health: AccountLimiter::new(&WEBHOOK_QUEUE_HEALTH_PER_PROJECT)?,
            cache_per_project: AccountLimiter::new(&CACHE_PER_PROJECT)?,
            profile_update: AccountLimiter::new(&PROFILE_UPDATE_PER_ACCOUNT)?,
            avatar_change: AccountLimiter::new(&AVATAR_CHANGE_PER_ACCOUNT)?,
            requests_per_client_ip: ClientIpLimiter::new(&REQUESTS_PER_CLIENT_IP)?,
        })
    }

    /// A password login: the account's and the network's limits, then the Argon2 work the
    /// client causes across every project.
    pub fn check_login(&self, attempt: &Attempt) -> Result<(), AttemptRejected> {
        self.login.check(attempt)?;

        self.password_work.check(Uuid::nil(), attempt.client_ip)
    }

    /// A signup: like a login, it costs an Argon2 run.
    pub fn check_signup(&self, attempt: &Attempt) -> Result<(), AttemptRejected> {
        self.signup.check(attempt)?;

        self.password_work.check(Uuid::nil(), attempt.client_ip)
    }

    pub fn forget_idle_keys(&self) {
        self.login.forget_idle_keys();
        self.password_work.forget_idle_keys();
        self.email.forget_idle_keys();
        self.invitations.forget_idle_keys();
        self.signup.forget_idle_keys();
        self.mfa.forget_idle_keys();
        self.oauth_authorization.forget_idle_keys();
        self.project_creation_per_client_ip.forget_idle_keys();
        self.project_creation_per_account.forget_idle_keys();
        self.token_redemption.forget_idle_keys();
        self.data_api_per_client_ip.forget_idle_keys();
        self.data_api_per_project.forget_idle_keys();
        self.webhook_queue_health.forget_idle_keys();
        self.cache_per_project.forget_idle_keys();
        self.profile_update.forget_idle_keys();
        self.avatar_change.forget_idle_keys();
        self.requests_per_client_ip.forget_idle_keys();
    }
}
