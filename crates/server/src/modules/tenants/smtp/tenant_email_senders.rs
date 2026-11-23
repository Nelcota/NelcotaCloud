use std::sync::Arc;
use std::time::Duration;

use moka::future::Cache;
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::smtp::pinned_email_sender::{
    PinnedConnection, PinnedSenderError, pinned_email_sender,
};
use crate::modules::tenants::smtp::smtp_address_probe::{SmtpUnreachable, first_reachable_address};
use crate::modules::tenants::smtp::smtp_endpoint::{SmtpEndpoint, SmtpEndpointError};
use crate::modules::tenants::smtp::smtp_host_policy::{SmtpHostPolicyError, resolve_smtp_endpoint};
use crate::modules::tenants::smtp::smtp_settings_repository::{
    StoredSmtpSettings, find_smtp_settings, smtp_url_context,
};
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};
use crate::shared::email::email_sender::{EmailError, EmailSender};

/// Senders are rebuilt this often, so the host policy is re-checked against fresh DNS.
const SENDER_TIME_TO_LIVE: Duration = Duration::from_secs(300);
const MAX_CACHED_SENDERS: u64 = 10_000;

#[derive(Debug, thiserror::Error)]
pub enum TenantSmtpError {
    #[error("database error while loading SMTP settings: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("stored SMTP URL is not valid UTF-8")]
    InvalidUrlEncoding,
    #[error(transparent)]
    Endpoint(#[from] SmtpEndpointError),
    #[error(transparent)]
    HostPolicy(#[from] SmtpHostPolicyError),
    #[error(transparent)]
    Unreachable(#[from] SmtpUnreachable),
    #[error(transparent)]
    PinnedSender(#[from] PinnedSenderError),
    #[error(transparent)]
    Email(#[from] EmailError),
}

/// The SMTP sender of each tenant: its own server when configured, the platform's otherwise.
pub struct TenantEmailSenders {
    control_plane_pool: PgPool,
    secret_box: Arc<SecretBox>,
    platform_sender: Arc<EmailSender>,
    /// Development only: lets tenants use SMTP servers on local or private hosts.
    allow_any_host: bool,
    senders: Cache<(Uuid, Uuid), Arc<EmailSender>>,
}

pub struct TenantEmailSendersConfig {
    pub control_plane_pool: PgPool,
    pub secret_box: Arc<SecretBox>,
    pub platform_sender: Arc<EmailSender>,
    pub allow_any_host: bool,
}

impl TenantEmailSenders {
    pub fn new(config: TenantEmailSendersConfig) -> Self {
        let senders = Cache::builder()
            .max_capacity(MAX_CACHED_SENDERS)
            .time_to_live(SENDER_TIME_TO_LIVE)
            .build();

        Self {
            control_plane_pool: config.control_plane_pool,
            secret_box: config.secret_box,
            platform_sender: config.platform_sender,
            allow_any_host: config.allow_any_host,
            senders,
        }
    }

    pub async fn sender_for(
        &self,
        tenant_id: Uuid,
    ) -> Result<Arc<EmailSender>, Arc<TenantSmtpError>> {
        let custom = self.custom_sender_for(tenant_id).await?;

        Ok(custom.unwrap_or_else(|| Arc::clone(&self.platform_sender)))
    }

    pub async fn custom_sender_for(
        &self,
        tenant_id: Uuid,
    ) -> Result<Option<Arc<EmailSender>>, Arc<TenantSmtpError>> {
        let stored = find_smtp_settings(&self.control_plane_pool, tenant_id)
            .await
            .map_err(TenantSmtpError::from)?;
        let Some(stored) = stored else {
            return Ok(None);
        };

        self.senders
            .try_get_with(
                (tenant_id, stored.revision),
                self.load_sender(tenant_id, stored),
            )
            .await
            .map(Some)
    }

    /// Applied to settings a tenant is about to save, and to stored ones before each use.
    pub async fn check_endpoint(
        &self,
        endpoint: &SmtpEndpoint,
    ) -> Result<Vec<std::net::IpAddr>, SmtpHostPolicyError> {
        resolve_smtp_endpoint(endpoint, self.allow_any_host == false).await
    }

    fn open_smtp_url(&self, tenant_id: Uuid, ciphertext: &[u8]) -> Result<String, TenantSmtpError> {
        let url_bytes = self
            .secret_box
            .open(ciphertext, &smtp_url_context(tenant_id))?;

        String::from_utf8(url_bytes).map_err(|_| TenantSmtpError::InvalidUrlEncoding)
    }

    /// A sender for settings an owner is about to save, under the same host policy as stored
    /// ones, so they can be tried before they take effect. Never cached.
    pub async fn unsaved_sender(
        &self,
        smtp_url: &str,
        email_from: &str,
    ) -> Result<EmailSender, TenantSmtpError> {
        self.pinned_sender(smtp_url, email_from).await
    }

    async fn load_sender(
        &self,
        tenant_id: Uuid,
        stored: StoredSmtpSettings,
    ) -> Result<Arc<EmailSender>, TenantSmtpError> {
        let smtp_url = self.open_smtp_url(tenant_id, &stored.smtp_url_ciphertext)?;
        let sender = self.pinned_sender(&smtp_url, &stored.email_from).await?;

        Ok(Arc::new(sender))
    }

    async fn pinned_sender(
        &self,
        smtp_url: &str,
        email_from: &str,
    ) -> Result<EmailSender, TenantSmtpError> {
        let endpoint = SmtpEndpoint::parse(smtp_url)?;
        let addresses = self.check_endpoint(&endpoint).await?;
        let address = first_reachable_address(&addresses, endpoint.port).await?;
        let connection = PinnedConnection {
            smtp_url,
            endpoint: &endpoint,
            address,
        };

        Ok(pinned_email_sender(&connection, email_from)?)
    }
}
