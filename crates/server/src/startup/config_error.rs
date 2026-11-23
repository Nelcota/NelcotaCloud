pub const MASTER_KEY_HEX_LENGTH: usize = 64;
pub const MIN_ADMIN_TOKEN_LENGTH: usize = 32;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ConfigError {
    #[error("invalid environment: {0}")]
    Environment(String),
    #[error("MASTER_KEY_HEX must be {MASTER_KEY_HEX_LENGTH} hex characters")]
    InvalidMasterKey,
    #[error("DATABASE_RUNTIME_PASSWORD must be {MASTER_KEY_HEX_LENGTH} hex characters")]
    InvalidDatabaseRuntimePassword,
    #[error("POOLER_AUTH_PASSWORD must be {MASTER_KEY_HEX_LENGTH} hex characters")]
    InvalidPoolerAuthPassword,
    #[error("ADMIN_TOKEN must be at least {MIN_ADMIN_TOKEN_LENGTH} characters")]
    AdminTokenTooShort,
    #[error("WEBHOOK_WORKER_REPLICAS must be between 1 and 8")]
    InvalidWebhookWorkerReplicas,
    #[error("configure all four STORAGE_R2 settings to enable project storage")]
    IncompleteStorageConfig,
    #[error("STORAGE_R2_BUCKET must be a valid lowercase R2 bucket name")]
    InvalidStorageBucket,
    #[error("{0} must not be empty")]
    EmptyValue(&'static str),
    #[error("{0} must be {1}")]
    InvalidUrl(&'static str, &'static str),
}
