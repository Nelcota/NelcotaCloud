use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::control_plane::site_url::SiteUrl;
use crate::control_plane::tenant_slug::TenantSlug;

pub struct NewTenant<'a> {
    pub tenant_id: Uuid,
    pub slug: &'a TenantSlug,
    pub name: &'a str,
    pub site_url: &'a SiteUrl,
    pub require_email_verification: bool,
    pub database_url_ciphertext: &'a [u8],
}

pub async fn insert_tenant(
    connection: &mut PgConnection,
    tenant: NewTenant<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tenants (id, slug, name, site_url, require_email_verification, database_url_ciphertext) VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(tenant.tenant_id)
    .bind(tenant.slug.as_str())
    .bind(tenant.name)
    .bind(tenant.site_url.as_str())
    .bind(tenant.require_email_verification)
    .bind(tenant.database_url_ciphertext)
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn find_database_url_ciphertext(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<Vec<u8>>, sqlx::Error> {
    sqlx::query_scalar("SELECT database_url_ciphertext FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .fetch_optional(pool)
        .await
}

pub async fn slug_exists(pool: &PgPool, slug: &TenantSlug) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM tenants WHERE slug = $1)")
        .bind(slug.as_str())
        .fetch_one(pool)
        .await
}
