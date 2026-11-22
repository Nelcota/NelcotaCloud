use std::time::Duration;

use sqlx::PgPool;

use crate::modules::auth::rate_limiting::shared_auth_limits::SharedAuthLimits;
use crate::modules::cache::access::cache_access::CACHE_PER_PROJECT;
use crate::shared::rate_limiting::account_limiter::AccountLimiter;
use crate::shared::rate_limiting::client_ip_limiter::ClientIpLimiter;
use crate::shared::rate_limiting::quota_spec::{InvalidQuota, QuotaSpec};

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
/// Auth quotas use the shared control plane. Other quotas are local to each instance.
pub struct RateLimits {
    pub auth: SharedAuthLimits,
    /// Invitations per console account.
    pub invitations: AccountLimiter,
    /// Starting a login carries no email, so it is limited per client IP only.
    pub oauth_authorization: ClientIpLimiter,
    /// Project creation from the console, per client IP across accounts.
    pub project_creation_per_client_ip: ClientIpLimiter,
    /// Project creation per console account (keyed by the nil project and the account).
    pub project_creation_per_account: AccountLimiter,
    /// Data API requests with the publishable key, per project and client IP.
    pub data_api_per_client_ip: ClientIpLimiter,
    /// Data API requests with the secret key or from the console, per project.
    pub data_api_per_project: AccountLimiter,
    pub webhook_queue_health: AccountLimiter,
    pub cache_per_project: AccountLimiter,
    /// Every request, per client IP across every route and project.
    pub requests_per_client_ip: ClientIpLimiter,
}

impl RateLimits {
    pub fn new(control_plane_pool: PgPool) -> Result<Self, InvalidQuota> {
        Ok(Self {
            auth: SharedAuthLimits(control_plane_pool),
            invitations: AccountLimiter::new(&INVITATIONS_PER_ACCOUNT)?,
            oauth_authorization: ClientIpLimiter::new(&OAUTH_START_PER_CLIENT_IP)?,
            project_creation_per_client_ip: ClientIpLimiter::new(&PROJECT_CREATION_PER_CLIENT_IP)?,
            project_creation_per_account: AccountLimiter::new(&PROJECT_CREATION_PER_ACCOUNT)?,
            data_api_per_client_ip: ClientIpLimiter::new(&DATA_API_PER_CLIENT_IP)?,
            data_api_per_project: AccountLimiter::new(&DATA_API_PER_PROJECT)?,
            webhook_queue_health: AccountLimiter::new(&WEBHOOK_QUEUE_HEALTH_PER_PROJECT)?,
            cache_per_project: AccountLimiter::new(&CACHE_PER_PROJECT)?,
            requests_per_client_ip: ClientIpLimiter::new(&REQUESTS_PER_CLIENT_IP)?,
        })
    }

    pub fn forget_idle_keys(&self) {
        self.invitations.forget_idle_keys();
        self.oauth_authorization.forget_idle_keys();
        self.project_creation_per_client_ip.forget_idle_keys();
        self.project_creation_per_account.forget_idle_keys();
        self.data_api_per_client_ip.forget_idle_keys();
        self.data_api_per_project.forget_idle_keys();
        self.webhook_queue_health.forget_idle_keys();
        self.cache_per_project.forget_idle_keys();
        self.requests_per_client_ip.forget_idle_keys();
    }
}
