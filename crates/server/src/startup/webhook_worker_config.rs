use serde::Deserialize;

use crate::startup::config_error::{ConfigError, MASTER_KEY_HEX_LENGTH};
use crate::startup::config_urls::validate_tenant_database_base_url;

#[derive(Deserialize)]
pub struct WebhookWorkerConfig {
    pub control_plane_database_url: String,
    pub tenant_database_base_url: String,
    pub database_schema_managed_externally: Option<bool>,
    pub master_key_hex: String,
    pub webhook_allow_private_hosts: Option<bool>,
}

impl WebhookWorkerConfig {
    pub fn from_environment() -> Result<Self, ConfigError> {
        envy::from_env().map_err(|error| ConfigError::Environment(error.to_string()))
    }

    pub(super) fn validate(&self) -> Result<(), ConfigError> {
        if self.control_plane_database_url.trim().is_empty() {
            return Err(ConfigError::EmptyValue("CONTROL_PLANE_DATABASE_URL"));
        }

        if self.master_key_hex.trim().len() != MASTER_KEY_HEX_LENGTH {
            return Err(ConfigError::InvalidMasterKey);
        }

        validate_tenant_database_base_url(self.tenant_database_base_url.trim())
    }
}
