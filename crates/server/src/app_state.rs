use std::sync::Arc;

use axum::extract::FromRef;
use axum::http::HeaderName;
use sqlx::PgPool;

use crate::modules::auth::email::auth_mailer::AuthMailer;
use crate::modules::auth::rate_limiting::auth_rate_limits::RateLimits;
use crate::modules::auth::session::session_grant::TokenSigning;
use crate::modules::database::execution::session_slots::SessionSlots;
use crate::modules::database::schema::schema_cache::SchemaCache;
use crate::modules::oauth::login::oauth_login_context::OAuthLoginContext;
use crate::modules::oauth::provider::provider_endpoints::OAuthEndpoints;
use crate::modules::tenants::api_keys::api_key_cache::ApiKeyCache;
use crate::modules::tenants::database::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::tenants::platform::platform_tenant::PlatformTenantDirectory;
use crate::modules::tenants::provisioning::tenant_provisioner::TenantProvisioner;
use crate::modules::tenants::provisioning::tenant_removal::TenantRemoval;
use crate::modules::tenants::signing_keys::signing_key_cache::SigningKeyCache;
use crate::modules::tenants::smtp::smtp_settings_change::SmtpSettingsStore;
use crate::modules::tenants::smtp::tenant_email_senders::TenantEmailSenders;
use crate::modules::webhooks::endpoint::webhook_endpoint_store::WebhookEndpointStore;
use crate::modules::webhooks::runtime::webhook_runtime::WebhookRuntime;
use crate::shared::crypto::opaque_token::TokenHash;
use crate::shared::crypto::secret_box::SecretBox;
use crate::shared::http::client_ip::ClientIpSource;

#[derive(Clone)]
pub struct AppState {
    pub control_plane_pool: PgPool,
    pub tenant_pools: Arc<TenantPoolRegistry>,
    /// What the Data API knows of each project's schema, per schema version.
    pub schema_cache: Arc<SchemaCache>,
    /// Bounds the Data API sessions running at once, across projects.
    pub data_api_slots: Arc<SessionSlots>,
    pub secret_box: Arc<SecretBox>,
    pub signing_keys: Arc<SigningKeyCache>,
    /// Owners of active API keys, so app requests skip the control plane.
    pub api_keys: Arc<ApiKeyCache>,
    pub platform_tenant: Arc<PlatformTenantDirectory>,
    pub rate_limits: Arc<RateLimits>,
    /// Each tenant's SMTP sender: its own server, or the platform's.
    pub email_senders: Arc<TenantEmailSenders>,
    /// Outbound calls to OAuth providers. Never follows redirects (OAuth security guidance).
    pub http_client: reqwest::Client,
    /// Webhook subscriptions, wake-up hints for the delivery worker and its HTTP transport.
    pub webhooks: Arc<WebhookRuntime>,
    pub settings: Arc<AppSettings>,
}

impl FromRef<AppState> for ClientIpSource {
    fn from_ref(state: &AppState) -> Self {
        Self(state.settings.client_ip_header.clone())
    }
}

impl AppState {
    pub fn tenant_removal(&self) -> TenantRemoval<'_> {
        TenantRemoval {
            control_plane_pool: &self.control_plane_pool,
            tenant_pools: &self.tenant_pools,
            signing_keys: &self.signing_keys,
            api_keys: &self.api_keys,
        }
    }

    pub fn auth_mailer(&self) -> AuthMailer {
        AuthMailer {
            control_plane_pool: self.control_plane_pool.clone(),
            email_senders: Arc::clone(&self.email_senders),
        }
    }

    pub fn token_signing(&self) -> TokenSigning<'_> {
        TokenSigning {
            signing_keys: &self.signing_keys,
            issuer: &self.settings.token_issuer,
        }
    }

    pub fn tenant_provisioner(&self) -> TenantProvisioner<'_> {
        TenantProvisioner {
            control_plane_pool: &self.control_plane_pool,
            secret_box: &self.secret_box,
            database_server: self.tenant_pools.database_server(),
        }
    }

    pub fn smtp_settings_store(&self) -> SmtpSettingsStore<'_> {
        SmtpSettingsStore {
            control_plane_pool: &self.control_plane_pool,
            secret_box: &self.secret_box,
            email_senders: &self.email_senders,
        }
    }

    pub fn webhook_endpoint_store(&self) -> WebhookEndpointStore<'_> {
        let webhooks = &self.webhooks;

        WebhookEndpointStore {
            control_plane_pool: &self.control_plane_pool,
            secret_box: &self.secret_box,
            subscriptions: &webhooks.subscriptions,
            policy: webhooks.transport.policy(),
        }
    }

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
    /// Only the SHA-256 of the admin token is kept in memory and compared.
    pub admin_token_hash: TokenHash,
    /// Verified against when an email does not exist, so login timing does not reveal accounts.
    pub dummy_password_hash: String,
    pub oauth_endpoints: OAuthEndpoints,
    pub oauth_callback_url: String,
    pub client_ip_header: Option<HeaderName>,
}
