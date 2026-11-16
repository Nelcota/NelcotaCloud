use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::smtp::smtp_endpoint::SmtpEndpoint;

/// What the owner sees: where emails go, never the credentials.
#[derive(Debug, Serialize, ToSchema)]
pub struct SmtpSettingsView {
    /// False while the tenant uses the platform's SMTP server.
    pub is_custom: bool,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<i32>,
    pub email_from: Option<String>,
}

/// The stored settings, with the URL still encrypted.
#[derive(sqlx::FromRow)]
pub struct StoredSmtpSettings {
    pub smtp_host: String,
    pub smtp_port: i32,
    pub smtp_url_ciphertext: Vec<u8>,
    pub email_from: String,
}

pub struct NewSmtpSettings<'a> {
    pub tenant_id: Uuid,
    pub endpoint: &'a SmtpEndpoint,
    pub smtp_url_ciphertext: &'a [u8],
    pub email_from: &'a str,
}

impl StoredSmtpSettings {
    pub fn view(self) -> SmtpSettingsView {
        SmtpSettingsView {
            is_custom: true,
            smtp_host: Some(self.smtp_host),
            smtp_port: Some(self.smtp_port),
            email_from: Some(self.email_from),
        }
    }
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

pub async fn find_smtp_settings(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<StoredSmtpSettings>, sqlx::Error> {
    sqlx::query_as(
        "SELECT smtp_host, smtp_port, smtp_url_ciphertext, email_from FROM tenant_smtp_settings WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
}

pub async fn save_smtp_settings(
    pool: &PgPool,
    settings: NewSmtpSettings<'_>,
) -> Result<(), sqlx::Error> {
    let endpoint = settings.endpoint;
    sqlx::query(
        "INSERT INTO tenant_smtp_settings (tenant_id, smtp_host, smtp_port, smtp_url_ciphertext, email_from) \
         VALUES ($1, $2, $3, $4, $5) \
         ON CONFLICT (tenant_id) DO UPDATE SET smtp_host = EXCLUDED.smtp_host, smtp_port = EXCLUDED.smtp_port, \
         smtp_url_ciphertext = EXCLUDED.smtp_url_ciphertext, email_from = EXCLUDED.email_from, updated_at = now()",
    )
    .bind(settings.tenant_id)
    .bind(&endpoint.host)
    .bind(i32::from(endpoint.port))
    .bind(settings.smtp_url_ciphertext)
    .bind(settings.email_from)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_smtp_settings(pool: &PgPool, tenant_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tenant_smtp_settings WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Binds the encrypted URL to its tenant, so it cannot be replayed in another row.
pub fn smtp_url_context(tenant_id: Uuid) -> String {
    format!("smtp_url:{tenant_id}")
}
