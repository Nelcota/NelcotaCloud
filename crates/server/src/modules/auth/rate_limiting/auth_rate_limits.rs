use crate::modules::auth::rate_limiting::account_limiter::AccountLimiter;
use uuid::Uuid;

use crate::modules::auth::rate_limiting::attempt_limiter::{Attempt, AttemptLimiter};
use crate::modules::auth::rate_limiting::client_ip_limiter::ClientIpLimiter;
use crate::modules::auth::rate_limiting::login_limiter::{LoginLimiter, LoginQuotas};
use crate::modules::auth::rate_limiting::quota_spec::{AttemptRejected, InvalidQuota};
use crate::modules::auth::rate_limiting::rate_limit_quotas::{
    AVATAR_CHANGE_PER_ACCOUNT, DATA_API_PER_CLIENT_IP, DATA_API_PER_PROJECT, EMAIL_PER_ADDRESS,
    EMAIL_PER_CLIENT_IP, EMAIL_PER_PROJECT, EMAIL_PER_RECIPIENT, INVITATIONS_PER_ACCOUNT,
    LOGIN_PER_CLIENT_IP, LOGIN_PER_EMAIL, LOGIN_PER_EMAIL_FROM_NETWORK, MFA_PER_ACCOUNT,
    MFA_PER_CLIENT_IP, OAUTH_START_PER_CLIENT_IP, PASSWORD_WORK_PER_CLIENT_IP,
    PROFILE_UPDATE_PER_ACCOUNT, PROJECT_CREATION_PER_ACCOUNT, PROJECT_CREATION_PER_CLIENT_IP,
    REQUESTS_PER_CLIENT_IP, SIGNUP_PER_CLIENT_IP, SIGNUP_PER_EMAIL, TOKEN_REDEMPTION_PER_CLIENT_IP,
};
use crate::modules::auth::rate_limiting::recipient_limiter::RecipientLimiter;

/// The limits of every rate-limited action.
///
/// In memory: enough for a single instance; they reset when the server restarts. Limiters keyed by "client IP across projects" or "project"
/// use the nil id for the part they do not key on.
pub struct RateLimits {
    pub login: LoginLimiter,
    /// Argon2 work (login, signup) per client IP, across every project.
    pub password_work: ClientIpLimiter,
    pub email_delivery: AttemptLimiter,
    /// Emails to one address, across every project.
    pub email_recipient: RecipientLimiter,
    /// Auth emails of one project (keyed by the project and the nil user).
    pub project_emails: AccountLimiter,
    /// Invitations per console account.
    pub invitations: AccountLimiter,
    pub signup: AttemptLimiter,
    /// Keyed by the account's email, like login.
    pub mfa: AttemptLimiter,
    /// Starting a login carries no email, so it is limited per client IP only.
    pub oauth_authorization: ClientIpLimiter,
    /// Project creation from the console, per client IP across accounts.
    pub project_creation: ClientIpLimiter,
    /// Project creation per console account (keyed by the nil project and the account).
    pub project_creation_per_account: AccountLimiter,
    /// Redeeming tokens and codes, per project and client IP.
    pub token_redemption: ClientIpLimiter,
    /// Data API requests with the publishable key, per project and client IP.
    pub data_api: ClientIpLimiter,
    /// Data API requests with the secret key or from the console, per project.
    pub data_api_per_project: AccountLimiter,
    /// A user changing their own profile (`PATCH /user`), per account.
    pub profile_update: AccountLimiter,
    /// A user changing their profile photo, per account.
    pub avatar_change: AccountLimiter,
    /// Every request, per client IP across every route and project.
    pub requests: ClientIpLimiter,
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
            email_delivery: AttemptLimiter::new(&EMAIL_PER_ADDRESS, &EMAIL_PER_CLIENT_IP)?,
            email_recipient: RecipientLimiter::new(&EMAIL_PER_RECIPIENT)?,
            project_emails: AccountLimiter::new(&EMAIL_PER_PROJECT)?,
            invitations: AccountLimiter::new(&INVITATIONS_PER_ACCOUNT)?,
            signup: AttemptLimiter::new(&SIGNUP_PER_EMAIL, &SIGNUP_PER_CLIENT_IP)?,
            mfa: AttemptLimiter::new(&MFA_PER_ACCOUNT, &MFA_PER_CLIENT_IP)?,
            oauth_authorization: ClientIpLimiter::new(&OAUTH_START_PER_CLIENT_IP)?,
            project_creation: ClientIpLimiter::new(&PROJECT_CREATION_PER_CLIENT_IP)?,
            project_creation_per_account: AccountLimiter::new(&PROJECT_CREATION_PER_ACCOUNT)?,
            token_redemption: ClientIpLimiter::new(&TOKEN_REDEMPTION_PER_CLIENT_IP)?,
            data_api: ClientIpLimiter::new(&DATA_API_PER_CLIENT_IP)?,
            data_api_per_project: AccountLimiter::new(&DATA_API_PER_PROJECT)?,
            profile_update: AccountLimiter::new(&PROFILE_UPDATE_PER_ACCOUNT)?,
            avatar_change: AccountLimiter::new(&AVATAR_CHANGE_PER_ACCOUNT)?,
            requests: ClientIpLimiter::new(&REQUESTS_PER_CLIENT_IP)?,
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

    /// An email to `attempt.email`: per address and client in the project, per address across
    /// projects, and per project.
    pub fn check_email(&self, attempt: &Attempt) -> Result<(), AttemptRejected> {
        self.email_delivery.check(attempt)?;
        self.email_recipient.check(attempt.email)?;

        self.project_emails.check(attempt.tenant_id, Uuid::nil())
    }

    pub fn forget_idle_keys(&self) {
        self.login.forget_idle_keys();
        self.password_work.forget_idle_keys();
        self.email_delivery.forget_idle_keys();
        self.email_recipient.forget_idle_keys();
        self.project_emails.forget_idle_keys();
        self.invitations.forget_idle_keys();
        self.signup.forget_idle_keys();
        self.mfa.forget_idle_keys();
        self.oauth_authorization.forget_idle_keys();
        self.project_creation.forget_idle_keys();
        self.project_creation_per_account.forget_idle_keys();
        self.token_redemption.forget_idle_keys();
        self.data_api.forget_idle_keys();
        self.data_api_per_project.forget_idle_keys();
        self.profile_update.forget_idle_keys();
        self.avatar_change.forget_idle_keys();
        self.requests.forget_idle_keys();
    }
}
