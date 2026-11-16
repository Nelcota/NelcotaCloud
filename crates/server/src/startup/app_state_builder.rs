use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

use crate::app_config::AppConfig;
use crate::app_state::AppState;
use crate::modules::auth::rate_limiting::auth_rate_limits::RateLimits;
use crate::modules::oauth::login::oauth_state_repository::delete_expired_authorizations;
use crate::modules::oauth::provider::provider_endpoints::OAuthEndpoints;
use crate::modules::tenants::database::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::tenants::signing_keys::signing_key_cache::SigningKeyCache;
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
    let master_key = decode_hex(config.master_key_hex.trim())?;
    let secret_box = Arc::new(SecretBox::new(&master_key)?);
    let control_plane_pool = connect_control_plane(config).await?;
    let settings = build_settings(config, oauth_endpoints).await?;
    let rate_limits = Arc::new(RateLimits::new()?);
    spawn_maintenance(control_plane_pool.clone(), Arc::clone(&rate_limits));

    Ok(AppState {
        tenant_pools: Arc::new(TenantPoolRegistry::new(
            control_plane_pool.clone(),
            config.tenant_database_base_url.clone(),
        )),
        signing_keys: Arc::new(signing_key_cache(&control_plane_pool, &secret_box)),
        rate_limits,
        email_sender: Arc::new(EmailSender::new(&config.smtp_url, &config.email_from)?),
        http_client: build_http_client()?,
        settings: Arc::new(settings),
        control_plane_pool,
        secret_box,
    })
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
