use axum::http::header::InvalidHeaderName;

use crate::modules::auth::password::password_hashing::PasswordHashingError;
use crate::modules::cache::entries::cache_store::InvalidCacheUrl;
use crate::modules::tenants::postgres::tenant_database_server::TenantDatabaseError;
use crate::modules::tenants::provisioning::tenant_slug::InvalidTenantSlug;
use crate::modules::webhooks::delivery::manual_send_limiter::InvalidSendQuota;
use crate::shared::crypto::hex_encoding::HexDecodeError;
use crate::shared::crypto::secret_box::SecretBoxError;
use crate::shared::email::email_sender::EmailError;
use crate::shared::rate_limiting::quota_spec::InvalidQuota;
use crate::startup::config_error::ConfigError;

#[derive(Debug, thiserror::Error)]
pub enum StartupError {
    #[error("usage: server [--webhook-worker]")]
    InvalidArguments,
    #[error("failed to load .env file: {0}")]
    EnvironmentFile(#[from] dotenvy::Error),
    #[error(transparent)]
    Config(#[from] ConfigError),
    #[error(transparent)]
    CacheUrl(#[from] InvalidCacheUrl),
    #[error("MASTER_KEY_HEX is not valid hex: {0}")]
    MasterKey(#[from] HexDecodeError),
    #[error(transparent)]
    SecretBox(#[from] SecretBoxError),
    #[error("failed to connect to the control plane database: {0}")]
    Database(#[from] sqlx::Error),
    #[error("failed to create the Data API roles on the tenant database server: {0}")]
    DatabaseRoles(sqlx::Error),
    #[error("failed to migrate the control plane database: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error("failed to prepare tenant database {slug}: {source}")]
    TenantMigration {
        slug: String,
        source: TenantDatabaseError,
    },
    #[error(transparent)]
    PasswordHashing(#[from] PasswordHashingError),
    #[error(transparent)]
    Email(#[from] EmailError),
    #[error("failed to build the HTTP client: {0}")]
    HttpClient(#[from] reqwest::Error),
    #[error(transparent)]
    RateLimits(#[from] InvalidQuota),
    #[error(transparent)]
    WebhookSendLimits(#[from] InvalidSendQuota),
    #[error("CLIENT_IP_HEADER is not a valid header name: {0}")]
    ClientIpHeader(#[from] InvalidHeaderName),
    #[error("PLATFORM_TENANT_SLUG is invalid: {0}")]
    PlatformTenantSlug(#[from] InvalidTenantSlug),
    #[error("server I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("the storage provider must be reachable to adopt legacy storage files")]
    StorageAdoptionUnavailable,
    #[error("a background task stopped unexpectedly")]
    BackgroundTaskStopped,
}
