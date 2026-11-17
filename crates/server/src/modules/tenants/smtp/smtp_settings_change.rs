use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::smtp::smtp_endpoint::{SmtpEndpoint, SmtpEndpointError};
use crate::modules::tenants::smtp::smtp_host_policy::SmtpHostPolicyError;
use crate::modules::tenants::smtp::smtp_settings_repository::{
    NewSmtpSettings, delete_smtp_settings, find_smtp_settings, save_smtp_settings, smtp_url_context,
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
    #[error("saved SMTP settings are missing")]
    MissingAfterSave,
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

/// Saves and resets tenant SMTP settings, always dropping the cached sender afterwards so the
/// next email uses what was saved.
pub struct SmtpSettingsStore<'a> {
    pub control_plane_pool: &'a PgPool,
    pub secret_box: &'a SecretBox,
    pub email_senders: &'a TenantEmailSenders,
}

impl SmtpSettingsStore<'_> {
    /// Checks the host policy and the sender before storing the URL, encrypted.
    pub async fn save(
        &self,
        change: SmtpSettingsChange<'_>,
    ) -> Result<SmtpSettingsView, SmtpSettingsChangeError> {
        let tenant_id = change.tenant_id;
        let endpoint = SmtpEndpoint::parse(change.smtp_url)?;
        self.email_senders.check_endpoint(&endpoint).await?;
        EmailSender::new(change.smtp_url, change.email_from)?;
        let url_bytes = change.smtp_url.as_bytes();
        let smtp_url_ciphertext = self
            .secret_box
            .seal(url_bytes, &smtp_url_context(tenant_id))?;
        let settings = NewSmtpSettings {
            tenant_id,
            endpoint: &endpoint,
            smtp_url_ciphertext: &smtp_url_ciphertext,
            email_from: change.email_from,
        };
        save_smtp_settings(self.control_plane_pool, settings).await?;
        self.email_senders.forget(tenant_id);

        self.stored_view(tenant_id).await
    }

    /// Back to the platform's SMTP server.
    pub async fn reset(&self, tenant_id: Uuid) -> Result<(), sqlx::Error> {
        delete_smtp_settings(self.control_plane_pool, tenant_id).await?;
        self.email_senders.forget(tenant_id);

        Ok(())
    }

    async fn stored_view(
        &self,
        tenant_id: Uuid,
    ) -> Result<SmtpSettingsView, SmtpSettingsChangeError> {
        let stored = find_smtp_settings(self.control_plane_pool, tenant_id).await?;
        let Some(stored) = stored else {
            return Err(SmtpSettingsChangeError::MissingAfterSave);
        };

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
        assert!(SmtpSettingsChangeError::MissingAfterSave.is_invalid_input() == false);
        let database = SmtpSettingsChangeError::Database(sqlx::Error::RowNotFound);
        assert!(database.is_invalid_input() == false);
    }
}
