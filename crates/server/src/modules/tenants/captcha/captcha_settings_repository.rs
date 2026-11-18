use sqlx::PgPool;
use uuid::Uuid;

/// The stored settings, with the secret key still encrypted.
#[derive(sqlx::FromRow)]
pub struct StoredCaptchaSettings {
    pub site_key: String,
    pub secret_key_ciphertext: Vec<u8>,
}

pub struct NewCaptchaSettings<'a> {
    pub tenant_id: Uuid,
    pub site_key: &'a str,
    pub secret_key_ciphertext: &'a [u8],
}

pub async fn find_captcha_settings(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<StoredCaptchaSettings>, sqlx::Error> {
    sqlx::query_as(
        "SELECT site_key, secret_key_ciphertext FROM tenant_captcha_settings WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
}

pub async fn save_captcha_settings(
    pool: &PgPool,
    settings: NewCaptchaSettings<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tenant_captcha_settings (tenant_id, site_key, secret_key_ciphertext) VALUES ($1, $2, $3) \
         ON CONFLICT (tenant_id) DO UPDATE SET site_key = EXCLUDED.site_key, \
         secret_key_ciphertext = EXCLUDED.secret_key_ciphertext, updated_at = now()",
    )
    .bind(settings.tenant_id)
    .bind(settings.site_key)
    .bind(settings.secret_key_ciphertext)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_captcha_settings(pool: &PgPool, tenant_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tenant_captcha_settings WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Binds the encrypted secret to its tenant, so it cannot be replayed in another row.
pub fn captcha_secret_context(tenant_id: Uuid) -> String {
    format!("captcha_secret:{tenant_id}")
}
