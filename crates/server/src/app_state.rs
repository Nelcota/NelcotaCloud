use std::sync::Arc;

use sqlx::PgPool;

use crate::shared::crypto::secret_box::SecretBox;
use axum::http::HeaderName;

use crate::modules::auth::rate_limiting::auth_rate_limits::RateLimits;
use crate::modules::oauth::login::oauth_login_context::OAuthLoginContext;
use crate::modules::oauth::provider::provider_endpoints::OAuthEndpoints;
use crate::modules::tenants::database::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::tenants::signing_keys::signing_key_cache::SigningKeyCache;
use crate::shared::email::email_sender::EmailSender;

#[derive(Clone)]
pub struct AppState {
    pub control_plane_pool: PgPool,
    pub tenant_pools: Arc<TenantPoolRegistry>,
    pub secret_box: Arc<SecretBox>,
    pub signing_keys: Arc<SigningKeyCache>,
    pub rate_limits: Arc<RateLimits>,
    pub email_sender: Arc<EmailSender>,
    /// Outbound calls to OAuth providers. Never follows redirects (OAuth security guidance).
    pub http_client: reqwest::Client,
    pub settings: Arc<AppSettings>,
}

impl AppState {
    pub fn oauth_login_context(&self) -> OAuthLoginContext<'_> {
        let settings = &self.settings;

        OAuthLoginContext {
            control_plane_pool: &self.control_plane_pool,
            secret_box: &self.secret_box,
            http_client: &self.http_client,
            endpoints: &settings.oauth_endpoints,
            callback_url: &settings.oauth_callback_url,
        }
    }
}

pub struct AppSettings {
    pub token_issuer: String,
    pub tenant_database_base_url: String,
    /// Only the SHA-256 of the admin token is kept in memory and compared.
    pub admin_token_hash: Vec<u8>,
    /// Verified against when an email does not exist, so login timing does not reveal accounts.
    pub dummy_password_hash: String,
    pub oauth_endpoints: OAuthEndpoints,
    pub oauth_callback_url: String,
    pub client_ip_header: Option<HeaderName>,
}
