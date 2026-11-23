use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::smtp::smtp_endpoint::SmtpEndpoint;

/// The stored settings, with the URL still encrypted.
#[derive(sqlx::FromRow)]
pub struct StoredSmtpSettings {
    pub revision: Uuid,
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

pub async fn find_smtp_settings(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<StoredSmtpSettings>, sqlx::Error> {
    sqlx::query_as(
        "SELECT smtp_host, smtp_port, smtp_url_ciphertext, email_from, revision FROM tenant_smtp_settings WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
}

pub async fn save_smtp_settings(
    connection: &mut PgConnection,
    settings: NewSmtpSettings<'_>,
) -> Result<StoredSmtpSettings, sqlx::Error> {
    let endpoint = settings.endpoint;
    sqlx::query_as(
        "INSERT INTO tenant_smtp_settings (tenant_id, smtp_host, smtp_port, smtp_url_ciphertext, email_from) \
         VALUES ($1, $2, $3, $4, $5) \
         ON CONFLICT (tenant_id) DO UPDATE SET smtp_host = EXCLUDED.smtp_host, smtp_port = EXCLUDED.smtp_port, \
         smtp_url_ciphertext = EXCLUDED.smtp_url_ciphertext, email_from = EXCLUDED.email_from,
         revision = EXCLUDED.revision, updated_at = now()
         RETURNING smtp_host, smtp_port, smtp_url_ciphertext, email_from, revision",
    )
    .bind(settings.tenant_id)
    .bind(&endpoint.host)
    .bind(i32::from(endpoint.port))
    .bind(settings.smtp_url_ciphertext)
    .bind(settings.email_from)
    .fetch_one(connection)
    .await
}

pub async fn delete_smtp_settings(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tenant_smtp_settings WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(connection)
        .await?;

    Ok(())
}

/// Binds the encrypted URL to its tenant, so it cannot be replayed in another row.
pub fn smtp_url_context(tenant_id: Uuid) -> String {
    format!("smtp_url:{tenant_id}")
}
