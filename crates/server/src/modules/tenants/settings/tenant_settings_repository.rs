use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::modules::tenants::settings::tenant_settings::TenantSettings;

/// Columns of every query returning `TenantSettings`; a macro so queries are built at compile
/// time with `concat!` instead of `format!` on every call.
macro_rules! settings_columns {
    () => {
        "name, site_url, require_email_verification, mascot_id, \
         (SELECT updated_at FROM tenant_logos WHERE tenant_logos.tenant_id = tenants.id) \
         AS logo_updated_at"
    };
}

/// Fields left as `None` keep their current value.
pub struct TenantSettingsChange<'a> {
    pub name: Option<&'a str>,
    pub site_url: Option<&'a SiteUrl>,
    pub require_email_verification: Option<bool>,
    pub mascot_id: Option<i16>,
}

pub async fn find_tenant_settings(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<TenantSettings>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT ",
        settings_columns!(),
        " FROM tenants WHERE id = $1"
    ))
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
}

pub async fn update_tenant_settings(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    change: TenantSettingsChange<'_>,
) -> Result<Option<TenantSettings>, sqlx::Error> {
    sqlx::query_as(concat!(
        "UPDATE tenants SET name = COALESCE($2, name), site_url = COALESCE($3, site_url), \
         require_email_verification = COALESCE($4, require_email_verification), \
         mascot_id = COALESCE($5, mascot_id) \
         WHERE id = $1 RETURNING ",
        settings_columns!()
    ))
    .bind(tenant_id)
    .bind(change.name)
    .bind(change.site_url.map(SiteUrl::as_str))
    .bind(change.require_email_verification)
    .bind(change.mascot_id)
    .fetch_optional(connection)
    .await
}

/// Only the flag: login, refresh and signup need nothing else from the tenant row.
pub async fn find_require_email_verification(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<bool>, sqlx::Error> {
    sqlx::query_scalar("SELECT require_email_verification FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .fetch_optional(pool)
        .await
}
