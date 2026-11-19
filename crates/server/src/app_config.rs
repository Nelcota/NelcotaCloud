use serde::Deserialize;

use crate::startup::config_error::{ConfigError, MASTER_KEY_HEX_LENGTH, MIN_ADMIN_TOKEN_LENGTH};
use crate::startup::config_urls::{validate_public_base_url, validate_tenant_database_base_url};

#[derive(Clone, Deserialize)]
pub struct AppConfig {
    pub control_plane_database_url: String,
    pub tenant_database_base_url: String,
    pub database_runtime_password: Option<String>,
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
    /// Development only: lets webhook endpoints use plain http and local or private hosts.
    /// Never enable it in production (it would allow SSRF into the network).
    pub webhook_allow_private_hosts: Option<bool>,
    pub webhook_worker_replicas: Option<u16>,
    pub cache_valkey_url: Option<String>,
    /// Slug of the tenant whose users are the platform accounts that log into the console.
    /// Unset, the platform API answers 503.
    pub platform_tenant_slug: Option<String>,
    /// Tests only: where captcha tokens are checked instead of Cloudflare Turnstile.
    pub captcha_verify_url: Option<String>,
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
            database_runtime_password: self.database_runtime_password,
            master_key_hex: self.master_key_hex.trim().to_owned(),
            admin_token: self.admin_token.trim().to_owned(),
            public_base_url: self.public_base_url.trim().to_owned(),
            bind_address: self.bind_address.trim().to_owned(),
            smtp_url: self.smtp_url.trim().to_owned(),
            email_from: self.email_from.trim().to_owned(),
            client_ip_header: self.client_ip_header.map(|header| header.trim().to_owned()),
            tenant_smtp_allow_any_host: self.tenant_smtp_allow_any_host,
            webhook_allow_private_hosts: self.webhook_allow_private_hosts,
            webhook_worker_replicas: self.webhook_worker_replicas,
            cache_valkey_url: self
                .cache_valkey_url
                .map(|url| url.trim().to_owned())
                .filter(|url| url.is_empty() == false),
            platform_tenant_slug: self
                .platform_tenant_slug
                .map(|slug| slug.trim().to_owned())
                .filter(|slug| slug.is_empty() == false),
            captcha_verify_url: self
                .captcha_verify_url
                .map(|url| url.trim().to_owned())
                .filter(|url| url.is_empty() == false),
        }
    }

    pub fn validate(&self) -> Result<(), ConfigError> {
        self.validate_required_values()?;
        self.validate_secrets()?;
        if (1..=8).contains(&self.expected_webhook_workers()) == false {
            return Err(ConfigError::InvalidWebhookWorkerReplicas);
        }

        validate_public_base_url(&self.public_base_url)?;
        validate_tenant_database_base_url(&self.tenant_database_base_url)
    }

    pub fn expected_webhook_workers(&self) -> u16 {
        self.webhook_worker_replicas.unwrap_or(1)
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

        if self
            .database_runtime_password
            .as_ref()
            .is_some_and(|password| {
                password.len() != MASTER_KEY_HEX_LENGTH
                    || password.bytes().all(|byte| byte.is_ascii_hexdigit()) == false
            })
        {
            return Err(ConfigError::InvalidDatabaseRuntimePassword);
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

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use super::*;

    fn valid_config() -> AppConfig {
        AppConfig {
            control_plane_database_url: "postgres://user:pass@localhost:5434/control".to_owned(),
            tenant_database_base_url: "postgres://user:pass@localhost:5434".to_owned(),
            database_runtime_password: None,
            master_key_hex: "a".repeat(MASTER_KEY_HEX_LENGTH),
            admin_token: "b".repeat(MIN_ADMIN_TOKEN_LENGTH),
            public_base_url: "https://auth.example.com".to_owned(),
            bind_address: "127.0.0.1:8080".to_owned(),
            smtp_url: "smtp://localhost:1026".to_owned(),
            email_from: "Auth <auth@example.com>".to_owned(),
            client_ip_header: None,
            tenant_smtp_allow_any_host: None,
            webhook_allow_private_hosts: None,
            webhook_worker_replicas: None,
            cache_valkey_url: None,
            platform_tenant_slug: None,
            captcha_verify_url: None,
        }
    }

    #[test]
    fn accepts_a_valid_config() {
        assert_eq!(valid_config().validate(), Ok(()));
    }

    #[test]
    fn validates_the_expected_webhook_worker_count() {
        for count in [0, 9] {
            let config = AppConfig {
                webhook_worker_replicas: Some(count),
                ..valid_config()
            };
            assert_eq!(
                config.validate(),
                Err(ConfigError::InvalidWebhookWorkerReplicas)
            );
        }
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
            "postgres://user:pass@localhost:5434/control",
            "postgres://user@localhost:5434",
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
