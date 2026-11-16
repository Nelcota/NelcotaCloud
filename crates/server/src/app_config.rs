use oauth2::url::Url;
use serde::Deserialize;

const MASTER_KEY_HEX_LENGTH: usize = 64;
const MIN_ADMIN_TOKEN_LENGTH: usize = 32;
const PUBLIC_URL_SCHEMES: [&str; 2] = ["http", "https"];
const POSTGRES_URL_SCHEMES: [&str; 2] = ["postgres", "postgresql"];

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
    /// Development only: lets tenants point their own SMTP settings at local or private hosts
    /// and any port. Never enable it in production (it would allow SSRF into the network).
    pub tenant_smtp_allow_any_host: Option<bool>,
    /// Slug of the tenant whose users are the platform accounts that log into the console.
    /// Unset, the platform API answers 503.
    pub platform_tenant_slug: Option<String>,
}

impl AppConfig {
    pub fn from_environment() -> Result<Self, ConfigError> {
        let config: Self =
            envy::from_env().map_err(|error| ConfigError::Environment(error.to_string()))?;
        let config = config.trimmed();
        config.validate()?;

        Ok(config)
    }

    /// Surrounding whitespace in `.env` files would otherwise leak into URLs, keys and issuers.
    fn trimmed(self) -> Self {
        Self {
            control_plane_database_url: self.control_plane_database_url.trim().to_owned(),
            tenant_database_base_url: self.tenant_database_base_url.trim().to_owned(),
            master_key_hex: self.master_key_hex.trim().to_owned(),
            admin_token: self.admin_token.trim().to_owned(),
            public_base_url: self.public_base_url.trim().to_owned(),
            bind_address: self.bind_address.trim().to_owned(),
            smtp_url: self.smtp_url.trim().to_owned(),
            email_from: self.email_from.trim().to_owned(),
            client_ip_header: self.client_ip_header.map(|header| header.trim().to_owned()),
            tenant_smtp_allow_any_host: self.tenant_smtp_allow_any_host,
            platform_tenant_slug: self
                .platform_tenant_slug
                .map(|slug| slug.trim().to_owned())
                .filter(|slug| slug.is_empty() == false),
        }
    }

    pub fn validate(&self) -> Result<(), ConfigError> {
        self.validate_required_values()?;
        self.validate_secrets()?;
        validate_public_base_url(&self.public_base_url)?;
        validate_tenant_database_base_url(&self.tenant_database_base_url)
    }

    fn validate_required_values(&self) -> Result<(), ConfigError> {
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

    fn validate_secrets(&self) -> Result<(), ConfigError> {
        if self.master_key_hex.trim().len() != MASTER_KEY_HEX_LENGTH {
            return Err(ConfigError::InvalidMasterKey);
        }

        if self.admin_token.trim().len() < MIN_ADMIN_TOKEN_LENGTH {
            return Err(ConfigError::AdminTokenTooShort);
        }

        Ok(())
    }

    pub fn token_issuer(&self) -> String {
        let base_url = self.public_base_url.trim().trim_end_matches('/');

        format!("{base_url}/auth/v1")
    }

    /// The single callback every tenant registers in its Google/GitHub OAuth app.
    pub fn oauth_callback_url(&self) -> String {
        format!("{}/oauth/callback", self.token_issuer())
    }
}

/// Becomes the JWT issuer and the OAuth callback, so it must be a plain http(s) origin or path.
fn validate_public_base_url(raw_url: &str) -> Result<(), ConfigError> {
    let invalid = ConfigError::InvalidUrl("PUBLIC_BASE_URL", "an http(s) URL without query");
    let Ok(url) = Url::parse(raw_url.trim()) else {
        return Err(invalid);
    };

    if PUBLIC_URL_SCHEMES.contains(&url.scheme()) == false || url.host_str().is_none() {
        return Err(invalid);
    }

    if url.query().is_some() || url.fragment().is_some() {
        return Err(invalid);
    }

    Ok(())
}

/// Each tenant database name is appended to it, so it must not carry a database path or query.
fn validate_tenant_database_base_url(raw_url: &str) -> Result<(), ConfigError> {
    let invalid = ConfigError::InvalidUrl(
        "TENANT_DATABASE_BASE_URL",
        "a postgres:// server URL without database name, query or fragment",
    );
    let Ok(url) = Url::parse(raw_url.trim()) else {
        return Err(invalid);
    };

    if POSTGRES_URL_SCHEMES.contains(&url.scheme()) == false || url.host_str().is_none() {
        return Err(invalid);
    }

    // A fragment would swallow the appended database name: every tenant would share one database.
    if url.path().trim_matches('/').is_empty() == false
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(invalid);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use super::*;

    fn valid_config() -> AppConfig {
        AppConfig {
            control_plane_database_url: "postgres://user:pass@localhost:5434/control".to_owned(),
            tenant_database_base_url: "postgres://user:pass@localhost:5434".to_owned(),
            master_key_hex: "a".repeat(MASTER_KEY_HEX_LENGTH),
            admin_token: "b".repeat(MIN_ADMIN_TOKEN_LENGTH),
            public_base_url: "https://auth.example.com".to_owned(),
            bind_address: "127.0.0.1:8080".to_owned(),
            smtp_url: "smtp://localhost:1026".to_owned(),
            email_from: "Auth <auth@example.com>".to_owned(),
            client_ip_header: None,
            tenant_smtp_allow_any_host: None,
            platform_tenant_slug: None,
        }
    }

    #[test]
    fn accepts_a_valid_config() {
        assert_eq!(valid_config().validate(), Ok(()));
    }

    #[test]
    fn rejects_short_or_blank_secrets() {
        let short_key = AppConfig {
            master_key_hex: "abc".to_owned(),
            ..valid_config()
        };
        let blank_token = AppConfig {
            admin_token: " ".repeat(40),
            ..valid_config()
        };

        assert_eq!(short_key.validate(), Err(ConfigError::InvalidMasterKey));
        assert_eq!(blank_token.validate(), Err(ConfigError::AdminTokenTooShort));
    }

    #[test]
    fn rejects_invalid_public_base_urls() {
        for raw_url in [
            "not a url",
            "ftp://auth.example.com",
            "https://auth.example.com/?a=1",
        ] {
            let config = AppConfig {
                public_base_url: raw_url.to_owned(),
                ..valid_config()
            };

            assert_matches!(
                config.validate(),
                Err(ConfigError::InvalidUrl("PUBLIC_BASE_URL", _))
            );
        }
    }

    #[test]
    fn rejects_tenant_database_urls_with_database_or_query() {
        for raw_url in [
            "postgres://localhost:5434/control",
            "postgres://localhost:5434?sslmode=require",
            "mysql://localhost:3306",
            "postgres://localhost:5434#fragment",
        ] {
            let config = AppConfig {
                tenant_database_base_url: raw_url.to_owned(),
                ..valid_config()
            };

            assert_matches!(
                config.validate(),
                Err(ConfigError::InvalidUrl("TENANT_DATABASE_BASE_URL", _))
            );
        }
    }

    #[test]
    fn trims_values_before_use() {
        let padded = AppConfig {
            public_base_url: "  https://auth.example.com/ \n".to_owned(),
            ..valid_config()
        };

        assert_eq!(
            padded.trimmed().token_issuer(),
            "https://auth.example.com/auth/v1"
        );
    }
}
