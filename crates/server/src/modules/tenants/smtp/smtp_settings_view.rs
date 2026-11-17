use serde::Serialize;
use utoipa::ToSchema;

use crate::modules::tenants::smtp::smtp_settings_repository::StoredSmtpSettings;

/// What the owner sees: where emails go, never the credentials.
#[derive(Debug, Serialize, ToSchema)]
pub struct SmtpSettingsView {
    /// False while the tenant uses the platform's SMTP server.
    pub is_custom: bool,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<i32>,
    pub email_from: Option<String>,
}

impl SmtpSettingsView {
    pub fn platform_default() -> Self {
        Self {
            is_custom: false,
            smtp_host: None,
            smtp_port: None,
            email_from: None,
        }
    }
}

impl From<StoredSmtpSettings> for SmtpSettingsView {
    fn from(stored: StoredSmtpSettings) -> Self {
        Self {
            is_custom: true,
            smtp_host: Some(stored.smtp_host),
            smtp_port: Some(stored.smtp_port),
            email_from: Some(stored.email_from),
        }
    }
}
