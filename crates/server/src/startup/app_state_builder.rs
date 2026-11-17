use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

use crate::app_config::AppConfig;
use crate::app_state::AppState;
use crate::modules::auth::rate_limiting::auth_rate_limits::RateLimits;
use crate::modules::database::execution::session_slots::SessionSlots;
use crate::modules::database::schema::schema_cache::SchemaCache;
use crate::modules::oauth::login::oauth_state_repository::delete_expired_authorizations;
use crate::modules::oauth::provider::provider_endpoints::OAuthEndpoints;
use crate::modules::tenants::database::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::tenants::platform::platform_tenant::PlatformTenantDirectory;
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::signing_keys::signing_key_cache::SigningKeyCache;
use crate::modules::tenants::smtp::tenant_email_senders::{
    TenantEmailSenders, TenantEmailSendersConfig,
};
use crate::modules::webhooks::delivery::manual_send_limiter::ManualSendLimiter;
use crate::modules::webhooks::delivery::tenant_delivery_run::DeliveryContext;
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::modules::webhooks::delivery::webhook_worker::WebhookWorker;
use crate::modules::webhooks::endpoint::webhook_url::WebhookHostPolicy;
use crate::modules::webhooks::outbox::webhook_hints::WebhookHints;
use crate::modules::webhooks::outbox::webhook_subscriptions::WebhookSubscriptions;
use crate::modules::webhooks::runtime::webhook_runtime::WebhookRuntime;
use crate::shared::crypto::hex_encoding::decode_hex;
use crate::shared::crypto::secret_box::SecretBox;
use crate::shared::database::migrators::CONTROL_PLANE_MIGRATOR;
use crate::shared::email::email_sender::EmailSender;
use crate::startup::app_settings_builder::build_settings;
use crate::startup::startup_error::StartupError;

const CONTROL_PLANE_MAX_CONNECTIONS: u32 = 10;
const OUTBOUND_HTTP_TIMEOUT: Duration = Duration::from_secs(10);
const MAINTENANCE_INTERVAL: Duration = Duration::from_secs(60);

pub async fn build_app_state(config: &AppConfig) -> Result<AppState, StartupError> {
    build_app_state_with_endpoints(config, OAuthEndpoints::production()).await
}

/// Tests pass endpoints of a fake OAuth provider here.
pub async fn build_app_state_with_endpoints(
    config: &AppConfig,
    oauth_endpoints: OAuthEndpoints,
) -> Result<AppState, StartupError> {
    let secret_box = Arc::new(secret_box(config)?);
    let control_plane_pool = connect_control_plane(config).await?;
    let settings = build_settings(config, oauth_endpoints).await?;
    let rate_limits = Arc::new(RateLimits::new()?);
    let email_senders = email_senders(config, &control_plane_pool, &secret_box)?;
    spawn_maintenance(control_plane_pool.clone(), Arc::clone(&rate_limits));

    let tenant_pools = Arc::new(tenant_pool_registry(config, &control_plane_pool));
    let database_server = tenant_pools.database_server();
    database_server
        .ensure_roles()
        .await
        .map_err(StartupError::DatabaseRoles)?;
    let webhook_dependencies = WebhookDependencies {
        control_plane_pool: &control_plane_pool,
        tenant_pools: &tenant_pools,
        secret_box: &secret_box,
    };
    let webhooks = start_webhooks(config, &webhook_dependencies)?;

    Ok(AppState {
        tenant_pools,
        schema_cache: Arc::new(SchemaCache::new()),
        data_api_slots: Arc::new(SessionSlots::new()),
        signing_keys: Arc::new(signing_key_cache(&control_plane_pool, &secret_box)),
        platform_tenant: Arc::new(platform_tenant_directory(config, &control_plane_pool)?),
        rate_limits,
        email_senders: Arc::new(email_senders),
        http_client: build_http_client()?,
        webhooks: Arc::new(webhooks),
        settings: Arc::new(settings),
        control_plane_pool,
        secret_box,
    })
}

fn secret_box(config: &AppConfig) -> Result<SecretBox, StartupError> {
    let master_key = decode_hex(config.master_key_hex.trim())?;

    Ok(SecretBox::new(&master_key)?)
}

fn tenant_pool_registry(config: &AppConfig, control_plane_pool: &PgPool) -> TenantPoolRegistry {
    let base_url = config.tenant_database_base_url.clone();

    TenantPoolRegistry::new(control_plane_pool.clone(), base_url)
}

fn email_senders(
    config: &AppConfig,
    control_plane_pool: &PgPool,
    secret_box: &Arc<SecretBox>,
) -> Result<TenantEmailSenders, StartupError> {
    let platform_sender = EmailSender::new(&config.smtp_url, &config.email_from)?;

    Ok(TenantEmailSenders::new(TenantEmailSendersConfig {
        control_plane_pool: control_plane_pool.clone(),
        secret_box: Arc::clone(secret_box),
        platform_sender: Arc::new(platform_sender),
        allow_any_host: config.tenant_smtp_allow_any_host.unwrap_or(false),
    }))
}

struct WebhookDependencies<'a> {
    control_plane_pool: &'a PgPool,
    tenant_pools: &'a Arc<TenantPoolRegistry>,
    secret_box: &'a Arc<SecretBox>,
}

/// Builds the webhook services and spawns the delivery worker they wake.
fn start_webhooks(
    config: &AppConfig,
    dependencies: &WebhookDependencies,
) -> Result<WebhookRuntime, StartupError> {
    let control_plane_pool = dependencies.control_plane_pool;
    let policy = webhook_host_policy(config);
    let transport = WebhookTransport::new(policy)?;
    let (hints, hint_receiver) = WebhookHints::channel();
    let context = DeliveryContext {
        control_plane_pool: control_plane_pool.clone(),
        tenant_pools: Arc::clone(dependencies.tenant_pools),
        secret_box: Arc::clone(dependencies.secret_box),
        transport: transport.clone(),
    };
    WebhookWorker::new(context, hint_receiver).spawn();

    Ok(WebhookRuntime {
        subscriptions: WebhookSubscriptions::new(control_plane_pool.clone()),
        hints,
        transport,
        manual_sends: ManualSendLimiter::new()?,
    })
}

fn webhook_host_policy(config: &AppConfig) -> WebhookHostPolicy {
    if config.webhook_allow_private_hosts == Some(true) {
        return WebhookHostPolicy::AllowPrivate;
    }

    WebhookHostPolicy::PublicHttpsOnly
}

fn platform_tenant_directory(
    config: &AppConfig,
    control_plane_pool: &PgPool,
) -> Result<PlatformTenantDirectory, StartupError> {
    let raw_slug = config.platform_tenant_slug.as_deref();
    let slug = raw_slug.map(TenantSlug::parse).transpose()?;

    Ok(PlatformTenantDirectory::new(
        control_plane_pool.clone(),
        slug,
    ))
}

/// Connects and brings the control plane schema up to date.
async fn connect_control_plane(config: &AppConfig) -> Result<PgPool, StartupError> {
    let control_plane_pool = PgPoolOptions::new()
        .max_connections(CONTROL_PLANE_MAX_CONNECTIONS)
        .connect(&config.control_plane_database_url)
        .await?;
    CONTROL_PLANE_MIGRATOR.run(&control_plane_pool).await?;

    Ok(control_plane_pool)
}

fn signing_key_cache(control_plane_pool: &PgPool, secret_box: &Arc<SecretBox>) -> SigningKeyCache {
    SigningKeyCache::new(control_plane_pool.clone(), Arc::clone(secret_box))
}

fn build_http_client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(OUTBOUND_HTTP_TIMEOUT)
        .build()
}

/// Periodic housekeeping for the lifetime of the process (or of the test runtime): forgets idle
/// rate limit keys and deletes abandoned OAuth authorizations.
fn spawn_maintenance(control_plane_pool: PgPool, rate_limits: Arc<RateLimits>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(MAINTENANCE_INTERVAL);

        loop {
            interval.tick().await;
            rate_limits.forget_idle_keys();

            if let Err(error) = delete_expired_authorizations(&control_plane_pool).await {
                tracing::error!(%error, "failed to delete expired OAuth authorizations");
            }
        }
    });
}
