pub const MASTER_KEY_HEX_LENGTH: usize = 64;
pub const MIN_ADMIN_TOKEN_LENGTH: usize = 32;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ConfigError {
    #[error("invalid environment: {0}")]
    Environment(String),
    #[error("MASTER_KEY_HEX must be {MASTER_KEY_HEX_LENGTH} hex characters")]
    InvalidMasterKey,
    #[error("ADMIN_TOKEN must be at least {MIN_ADMIN_TOKEN_LENGTH} characters")]
    AdminTokenTooShort,
    #[error("{0} must not be empty")]
    EmptyValue(&'static str),
    #[error("{0} must be {1}")]
    InvalidUrl(&'static str, &'static str),
}
