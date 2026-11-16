use sqlx::{PgConnection, PgExecutor, PgPool};
use uuid::Uuid;

use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::settings::site_url::SiteUrl;

/// Namespaces the advisory lock key, so it cannot collide with other advisory lock users.
const SLUG_LOCK_PREFIX: &str = "tenant_slug:";

pub struct NewTenant<'a> {
    pub tenant_id: Uuid,
    pub slug: &'a TenantSlug,
    pub name: &'a str,
    pub site_url: &'a SiteUrl,
    pub require_email_verification: bool,
}

pub async fn insert_tenant(
    connection: &mut PgConnection,
    tenant: NewTenant<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tenants (id, slug, name, site_url, require_email_verification) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(tenant.tenant_id)
    .bind(tenant.slug.as_str())
    .bind(tenant.name)
    .bind(tenant.site_url.as_str())
    .bind(tenant.require_email_verification)
    .execute(connection)
    .await?;

    Ok(())
}

/// The tenant's database name derives from the slug, so the slug is all a pool needs.
pub async fn find_tenant_slug(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar("SELECT slug FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .fetch_optional(pool)
        .await
}

pub async fn find_tenant_id_by_slug(
    pool: &PgPool,
    slug: &TenantSlug,
) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar("SELECT id FROM tenants WHERE slug = $1")
        .bind(slug.as_str())
        .fetch_optional(pool)
        .await
}

pub async fn slug_exists<'e>(
    executor: impl PgExecutor<'e>,
    slug: &TenantSlug,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM tenants WHERE slug = $1)")
        .bind(slug.as_str())
        .fetch_one(executor)
        .await
}

/// Serializes provisioning of one slug across requests and server instances until the
/// transaction ends. Under this lock, a database without a tenant row is an orphan.
pub async fn lock_slug(
    connection: &mut PgConnection,
    slug: &TenantSlug,
) -> Result<(), sqlx::Error> {
    let lock_name = format!("{SLUG_LOCK_PREFIX}{}", slug.as_str());
    sqlx::query("SELECT pg_advisory_xact_lock(hashtext($1))")
        .bind(lock_name)
        .execute(connection)
        .await?;

    Ok(())
}
