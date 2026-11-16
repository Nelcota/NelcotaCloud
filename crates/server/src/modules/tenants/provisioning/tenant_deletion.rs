use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::provisioning::tenant_repository::lock_slug;
use crate::modules::tenants::provisioning::tenant_slug::{InvalidTenantSlug, TenantSlug};

#[derive(Debug, thiserror::Error)]
pub enum TenantDeletionError {
    #[error("database error while deleting tenant: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored tenant slug is invalid: {0}")]
    InvalidSlug(#[from] InvalidTenantSlug),
}

/// Deletes the tenant row (its keys, OAuth apps and members go with it by cascade) under the
/// slug lock, and returns the slug whose database the caller drops next. `None` if there is
/// no such tenant.
///
/// The database is dropped after the commit: if dropping fails, what is left is an orphan that
/// the next provisioning of the slug replaces.
pub async fn delete_tenant_row(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<TenantSlug>, TenantDeletionError> {
    let mut transaction = pool.begin().await?;
    let raw_slug: Option<String> =
        sqlx::query_scalar("SELECT slug FROM tenants WHERE id = $1 FOR UPDATE")
            .bind(tenant_id)
            .fetch_optional(&mut *transaction)
            .await?;
    let Some(raw_slug) = raw_slug else {
        return Ok(None);
    };
    let slug = TenantSlug::parse(&raw_slug)?;
    lock_slug(&mut transaction, &slug).await?;
    sqlx::query("DELETE FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;

    Ok(Some(slug))
}
