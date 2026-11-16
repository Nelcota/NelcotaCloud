use axum::http::header::InvalidHeaderName;

use crate::app_config::ConfigError;
use crate::modules::auth::password::password_hashing::PasswordHashingError;
use crate::modules::auth::rate_limiting::attempt_limiter::InvalidQuota;
use crate::shared::crypto::hex_encoding::HexDecodeError;
use crate::shared::crypto::secret_box::SecretBoxError;
use crate::shared::email::email_sender::EmailError;

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
