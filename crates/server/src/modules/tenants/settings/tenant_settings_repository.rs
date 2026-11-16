use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::settings::site_url::SiteUrl;

const SETTINGS_COLUMNS: &str = "name, site_url, require_email_verification";

/// Settings a tenant manages itself with its secret key.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct TenantSettings {
    pub name: String,
    pub site_url: String,
    pub require_email_verification: bool,
}

/// Fields left as `None` keep their current value.
pub struct TenantSettingsChange<'a> {
    pub name: Option<&'a str>,
    pub site_url: Option<&'a SiteUrl>,
    pub require_email_verification: Option<bool>,
}

pub async fn find_tenant_settings(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<TenantSettings>, sqlx::Error> {
    let query = format!("SELECT {SETTINGS_COLUMNS} FROM tenants WHERE id = $1");

    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(tenant_id)
        .fetch_optional(pool)
        .await
}

pub async fn update_tenant_settings(
    pool: &PgPool,
    tenant_id: Uuid,
    change: TenantSettingsChange<'_>,
) -> Result<Option<TenantSettings>, sqlx::Error> {
    let query = format!(
        "UPDATE tenants SET name = COALESCE($2, name), site_url = COALESCE($3, site_url), \
         require_email_verification = COALESCE($4, require_email_verification) \
         WHERE id = $1 RETURNING {SETTINGS_COLUMNS}"
    );

    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(tenant_id)
        .bind(change.name)
        .bind(change.site_url.map(SiteUrl::as_str))
        .bind(change.require_email_verification)
        .fetch_optional(pool)
        .await
}
