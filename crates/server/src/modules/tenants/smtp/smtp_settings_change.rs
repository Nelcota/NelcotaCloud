use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::tenants::smtp::smtp_endpoint::{SmtpEndpoint, SmtpEndpointError};
use crate::modules::tenants::smtp::smtp_host_policy::SmtpHostPolicyError;
use crate::modules::tenants::smtp::smtp_settings_repository::{
    NewSmtpSettings, save_smtp_settings, smtp_url_context,
};
use crate::modules::tenants::smtp::smtp_settings_view::SmtpSettingsView;
use crate::modules::tenants::smtp::tenant_email_senders::TenantEmailSenders;
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};
use crate::shared::email::email_sender::{EmailError, EmailSender};

#[derive(Debug, thiserror::Error)]
pub enum SmtpSettingsChangeError {
    #[error(transparent)]
    Endpoint(#[from] SmtpEndpointError),
    #[error(transparent)]
    HostPolicy(#[from] SmtpHostPolicyError),
    #[error(transparent)]
    Sender(#[from] EmailError),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("database error while saving SMTP settings: {0}")]
    Database(#[from] sqlx::Error),
}

impl SmtpSettingsChangeError {
    /// Errors the owner can fix in the settings they sent.
    pub fn is_invalid_input(&self) -> bool {
        matches!(
            self,
            Self::Endpoint(_) | Self::HostPolicy(_) | Self::Sender(_)
        )
    }
}

/// A tenant's new SMTP server, as typed by its owner.
pub struct SmtpSettingsChange<'a> {
    pub tenant_id: Uuid,
    pub smtp_url: &'a str,
    pub email_from: &'a str,
}

/// Checks SMTP settings before the caller opens its control plane transaction.
pub struct SmtpSettingsStore<'a> {
    pub secret_box: &'a SecretBox,
    pub email_senders: &'a TenantEmailSenders,
}

pub struct CheckedSmtpSettings<'a> {
    change: SmtpSettingsChange<'a>,
    endpoint: SmtpEndpoint,
    ciphertext: Vec<u8>,
}

impl SmtpSettingsStore<'_> {
    /// Checks the host policy and the sender before storing the URL, encrypted.
    pub async fn prepare<'a>(
        &self,
        change: SmtpSettingsChange<'a>,
    ) -> Result<CheckedSmtpSettings<'a>, SmtpSettingsChangeError> {
        let tenant_id = change.tenant_id;
        let endpoint = SmtpEndpoint::parse(change.smtp_url)?;
        self.email_senders.check_endpoint(&endpoint).await?;
        EmailSender::new(change.smtp_url, change.email_from)?;
        let url_bytes = change.smtp_url.as_bytes();
        let ciphertext = self
            .secret_box
            .seal(url_bytes, &smtp_url_context(tenant_id))?;

        Ok(CheckedSmtpSettings {
            change,
            endpoint,
            ciphertext,
        })
    }
}

impl CheckedSmtpSettings<'_> {
    pub async fn save(
        self,
        connection: &mut PgConnection,
    ) -> Result<SmtpSettingsView, SmtpSettingsChangeError> {
        let settings = NewSmtpSettings {
            tenant_id: self.change.tenant_id,
            endpoint: &self.endpoint,
            smtp_url_ciphertext: &self.ciphertext,
            email_from: self.change.email_from,
        };
        let stored = save_smtp_settings(connection, settings).await?;

        Ok(SmtpSettingsView::from(stored))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Settings errors become 400s the owner can fix; anything else is our 500.
    #[test]
    fn only_errors_in_the_sent_settings_are_invalid_input() {
        assert!(
            SmtpSettingsChangeError::Endpoint(SmtpEndpointError::MissingHost).is_invalid_input()
        );
        assert!(
            SmtpSettingsChangeError::HostPolicy(SmtpHostPolicyError::PrivateHost)
                .is_invalid_input()
        );
        let database = SmtpSettingsChangeError::Database(sqlx::Error::RowNotFound);
        assert!(database.is_invalid_input() == false);
    }
}
