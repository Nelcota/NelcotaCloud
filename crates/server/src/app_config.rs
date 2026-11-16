use serde::Deserialize;

const MASTER_KEY_HEX_LENGTH: usize = 64;
const MIN_ADMIN_TOKEN_LENGTH: usize = 32;

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("invalid environment: {0}")]
    Environment(#[from] envy::Error),
    #[error("MASTER_KEY_HEX must be {MASTER_KEY_HEX_LENGTH} hex characters")]
    InvalidMasterKey,
    #[error("ADMIN_TOKEN must be at least {MIN_ADMIN_TOKEN_LENGTH} characters")]
    AdminTokenTooShort,
    #[error("{0} must not be empty")]
    EmptyValue(&'static str),
}

#[derive(Clone, Deserialize)]
pub struct AppConfig {
    pub control_plane_database_url: String,
    pub tenant_database_base_url: String,
    pub master_key_hex: String,
    pub admin_token: String,
    pub public_base_url: String,
    pub bind_address: String,
    pub smtp_url: String,
    pub email_from: String,
    /// Header set by a trusted proxy with the client IP (e.g. `cf-connecting-ip`). Leave unset
    /// unless the server is reachable only through that proxy, or clients could spoof it.
    pub client_ip_header: Option<String>,
}

impl AppConfig {
    pub fn from_environment() -> Result<Self, ConfigError> {
        let config: AppConfig = envy::from_env()?;
        config.validate()?;

        Ok(config)
    }

    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.master_key_hex.trim().len() != MASTER_KEY_HEX_LENGTH {
            return Err(ConfigError::InvalidMasterKey);
        }

        if self.admin_token.trim().len() < MIN_ADMIN_TOKEN_LENGTH {
            return Err(ConfigError::AdminTokenTooShort);
        }

        let required_values = [
            (
                "CONTROL_PLANE_DATABASE_URL",
                &self.control_plane_database_url,
            ),
            ("TENANT_DATABASE_BASE_URL", &self.tenant_database_base_url),
            ("PUBLIC_BASE_URL", &self.public_base_url),
            ("BIND_ADDRESS", &self.bind_address),
            ("SMTP_URL", &self.smtp_url),
            ("EMAIL_FROM", &self.email_from),
        ];

        for (name, value) in required_values {
            if value.trim().is_empty() {
                return Err(ConfigError::EmptyValue(name));
            }
        }

        Ok(())
    }

    pub fn token_issuer(&self) -> String {
        let base_url = self.public_base_url.trim_end_matches('/');

        format!("{base_url}/auth/v1")
    }

    /// The single callback every tenant registers in its Google/GitHub OAuth app.
    pub fn oauth_callback_url(&self) -> String {
        format!("{}/oauth/callback", self.token_issuer())
    }
}
