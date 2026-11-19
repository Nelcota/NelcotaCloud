use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;

use crate::app_config::AppConfig;
use crate::app_state::AppState;
use crate::modules::cache::entries::cache_store::CacheStore;
use crate::modules::database::execution::session_slots::SessionSlots;
use crate::modules::database::schema::schema_cache::SchemaCache;
use crate::modules::oauth::provider::provider_endpoints::OAuthEndpoints;
use crate::modules::tenants::api_keys::api_key_usage::ApiKeyUsage;
use crate::modules::tenants::platform::platform_tenant::PlatformTenantDirectory;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::tenants::provisioning::tenant_provisioner::MAX_CONCURRENT_PROVISIONING;
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::signing_keys::signing_key_cache::SigningKeyCache;
use crate::modules::tenants::smtp::tenant_email_senders::{
    TenantEmailSenders, TenantEmailSendersConfig,
};
use crate::modules::webhooks::delivery::manual_send_limiter::ManualSendLimiter;
use crate::modules::webhooks::outbox::webhook_hints::{WebhookHintReceiver, WebhookHints};
use crate::modules::webhooks::outbox::webhook_subscriptions::WebhookSubscriptions;
use crate::modules::webhooks::runtime::webhook_runtime::WebhookRuntime;
use crate::rate_limits::RateLimits;
use crate::shared::crypto::secret_box::SecretBox;
use crate::shared::email::email_sender::EmailSender;
use crate::startup::app_settings_builder::build_settings;
use crate::startup::background_tasks::BackgroundTasks;
use crate::startup::service_dependencies::{
    cache_authentication_pool, master_secret_box, prepare_control_plane, webhook_transport,
};
use crate::startup::startup_error::StartupError;
use crate::startup::tenant_database_preparation::prepare_existing_tenants;

const OUTBOUND_HTTP_TIMEOUT: Duration = Duration::from_secs(10);

pub async fn build_app_state(
    config: &AppConfig,
) -> Result<(AppState, BackgroundTasks), StartupError> {
    build_app_state_with_endpoints(config, OAuthEndpoints::production()).await
}

/// Tests pass endpoints of a fake OAuth provider here.
pub async fn build_app_state_with_endpoints(
    config: &AppConfig,
    oauth_endpoints: OAuthEndpoints,
) -> Result<(AppState, BackgroundTasks), StartupError> {
    let secret_box = Arc::new(master_secret_box(&config.master_key_hex)?);
    let runtime_password = config.database_runtime_password.as_deref();
    let control_plane_pool =
        prepare_control_plane(&config.control_plane_database_url, runtime_password).await?;
    let settings = build_settings(config, oauth_endpoints).await?;
    let rate_limits = Arc::new(RateLimits::new()?);
    let email_senders = email_senders(config, &control_plane_pool, &secret_box)?;

    let registry = TenantPoolRegistry::new(
        control_plane_pool.clone(),
        config.tenant_database_base_url.clone(),
    );
    let registry = match runtime_password {
        Some(password) => registry.with_runtime_password(password.to_owned()),
        None => registry,
    };
    let tenant_pools = Arc::new(registry);
    let database_server = tenant_pools.database_server();
    database_server
        .ensure_roles()
        .await
        .map_err(StartupError::DatabaseRoles)?;
    if let Some(password) = runtime_password {
        database_server
            .prepare_runtime_role(password)
            .await
            .map_err(StartupError::DatabaseRoles)?;
        prepare_existing_tenants(&control_plane_pool, &database_server).await?;
    }
    let (webhooks, webhook_hints) = build_webhooks(config, &control_plane_pool)?;

    let state = AppState {
        project_usage: Default::default(),
        cache_authentication_pool: cache_authentication_pool(&control_plane_pool),
        cache_store: config
            .cache_valkey_url
            .as_deref()
            .map(CacheStore::connect_lazily)
            .transpose()?,
        tenant_pools,
        schema_cache: Arc::new(SchemaCache::new()),
        database_session_slots: Arc::new(SessionSlots::new()),
        signing_keys: Arc::new(signing_key_cache(&control_plane_pool, &secret_box)),
        tenant_provisioning_slots: Arc::new(tokio::sync::Semaphore::new(
            MAX_CONCURRENT_PROVISIONING,
        )),
        api_key_usage: Arc::new(ApiKeyUsage::new(control_plane_pool.clone())),
        platform_tenant: Arc::new(platform_tenant_directory(config, &control_plane_pool)?),
        rate_limits,
        email_senders: Arc::new(email_senders),
        http_client: build_http_client()?,
        webhooks: Arc::new(webhooks),
        settings: Arc::new(settings),
        control_plane_pool,
        secret_box,
    };
    let tasks = BackgroundTasks::start(state.clone(), webhook_hints);

    Ok((state, tasks))
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

fn build_webhooks(
    config: &AppConfig,
    control_plane_pool: &PgPool,
) -> Result<(WebhookRuntime, WebhookHintReceiver), StartupError> {
    let transport = webhook_transport(config.webhook_allow_private_hosts)?;
    let (hints, hint_receiver) = WebhookHints::channel();
    let runtime = WebhookRuntime {
        subscriptions: WebhookSubscriptions::new(control_plane_pool.clone()),
        hints,
        transport,
        manual_sends: ManualSendLimiter::new()?,
    };

    Ok((runtime, hint_receiver))
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

fn signing_key_cache(control_plane_pool: &PgPool, secret_box: &Arc<SecretBox>) -> SigningKeyCache {
    SigningKeyCache::new(control_plane_pool.clone(), Arc::clone(secret_box))
}

fn build_http_client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(OUTBOUND_HTTP_TIMEOUT)
        .build()
}
