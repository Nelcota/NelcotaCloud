use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::http::HeaderName;
use axum::http::header::InvalidHeaderName;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;

use crate::app_config::{AppConfig, ConfigError};
use crate::app_state::{AppSettings, AppState};
use crate::auth::password_hashing::{PasswordHashingError, hash_password};
use crate::control_plane::signing_key_cache::SigningKeyCache;
use crate::crypto::hex_encoding::{HexDecodeError, decode_hex, encode_hex};
use crate::crypto::opaque_token::hash_opaque_token;
use crate::crypto::random_bytes::random_bytes;
use crate::crypto::secret_box::{SecretBox, SecretBoxError};
use crate::email::email_sender::{EmailError, EmailSender};
use crate::http::rate_limits::{InvalidQuota, RateLimits};
use crate::http::router::build_router;
use crate::oauth::provider_endpoints::OAuthEndpoints;
use crate::tenant_database::migrators::CONTROL_PLANE_MIGRATOR;
use crate::tenant_database::tenant_pool_registry::TenantPoolRegistry;

const CONTROL_PLANE_MAX_CONNECTIONS: u32 = 10;
const DUMMY_PASSWORD_BYTES: usize = 32;
const OUTBOUND_HTTP_TIMEOUT: Duration = Duration::from_secs(10);
const RATE_LIMIT_CLEANUP_INTERVAL: Duration = Duration::from_secs(60);

#[derive(Debug, thiserror::Error)]
pub enum StartupError {
    #[error("failed to load .env file: {0}")]
    EnvironmentFile(#[from] dotenvy::Error),
    #[error(transparent)]
    Config(#[from] ConfigError),
    #[error("MASTER_KEY_HEX is not valid hex: {0}")]
    MasterKey(#[from] HexDecodeError),
    #[error(transparent)]
    SecretBox(#[from] SecretBoxError),
    #[error("failed to connect to the control plane database: {0}")]
    Database(#[from] sqlx::Error),
    #[error("failed to migrate the control plane database: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error(transparent)]
    PasswordHashing(#[from] PasswordHashingError),
    #[error(transparent)]
    Email(#[from] EmailError),
    #[error("failed to build the HTTP client: {0}")]
    HttpClient(#[from] reqwest::Error),
    #[error(transparent)]
    RateLimits(#[from] InvalidQuota),
    #[error("CLIENT_IP_HEADER is not a valid header name: {0}")]
    ClientIpHeader(#[from] InvalidHeaderName),
    #[error("server I/O error: {0}")]
    Io(#[from] std::io::Error),
}

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
    let control_plane_pool = PgPoolOptions::new()
        .max_connections(CONTROL_PLANE_MAX_CONNECTIONS)
        .connect(&config.control_plane_database_url)
        .await?;
    CONTROL_PLANE_MIGRATOR.run(&control_plane_pool).await?;
    let settings = build_settings(config, oauth_endpoints).await?;
    let rate_limits = Arc::new(RateLimits::new()?);
    spawn_rate_limit_cleanup(Arc::clone(&rate_limits));

    Ok(AppState {
        tenant_pools: Arc::new(TenantPoolRegistry::new(
            control_plane_pool.clone(),
            Arc::clone(&secret_box),
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

async fn build_settings(
    config: &AppConfig,
    oauth_endpoints: OAuthEndpoints,
) -> Result<AppSettings, StartupError> {
    let unguessable_password = encode_hex(&random_bytes::<DUMMY_PASSWORD_BYTES>());
    let client_ip_header = config
        .client_ip_header
        .as_deref()
        .map(str::trim)
        .filter(|header| header.is_empty() == false)
        .map(|header| HeaderName::from_bytes(header.to_lowercase().as_bytes()))
        .transpose()?;

    Ok(AppSettings {
        token_issuer: config.token_issuer(),
        tenant_database_base_url: config.tenant_database_base_url.clone(),
        admin_token_hash: hash_opaque_token(config.admin_token.trim()),
        dummy_password_hash: hash_password(unguessable_password).await?,
        oauth_endpoints,
        oauth_callback_url: config.oauth_callback_url(),
        client_ip_header,
    })
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

/// Runs for the lifetime of the process (or of the test runtime).
fn spawn_rate_limit_cleanup(rate_limits: Arc<RateLimits>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(RATE_LIMIT_CLEANUP_INTERVAL);

        loop {
            interval.tick().await;
            rate_limits.forget_idle_keys();
        }
    });
}

pub async fn run_server(config: AppConfig) -> Result<(), StartupError> {
    let state = build_app_state(&config).await?;
    let listener = TcpListener::bind(&config.bind_address).await?;
    tracing::info!(address = %config.bind_address, "server listening");
    // Connect info gives handlers the peer address used for per-IP rate limits.
    let service = build_router(state).into_make_service_with_connect_info::<SocketAddr>();

    axum::serve(listener, service)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    if let Err(error) = tokio::signal::ctrl_c().await {
        tracing::error!(%error, "failed to listen for the shutdown signal");
    }
}
