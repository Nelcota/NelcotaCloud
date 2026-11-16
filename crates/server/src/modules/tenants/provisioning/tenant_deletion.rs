use sqlx::PgConnection;
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

/// Deletes the tenant row inside the caller's transaction, holding the slug lock.
///
/// Its keys, OAuth apps and members go with it by cascade. Returns the slug whose database
/// the caller drops before committing; `None` if there is no such tenant.
pub async fn delete_tenant_row(
    transaction: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<Option<TenantSlug>, TenantDeletionError> {
    let raw_slug: Option<String> =
        sqlx::query_scalar("SELECT slug FROM tenants WHERE id = $1 FOR UPDATE")
            .bind(tenant_id)
            .fetch_optional(&mut *transaction)
            .await?;
    let Some(raw_slug) = raw_slug else {
        return Ok(None);
    };
    let slug = TenantSlug::parse(&raw_slug)?;
    lock_slug(transaction, &slug).await?;
    sqlx::query("DELETE FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .execute(&mut *transaction)
        .await?;

    Ok(Some(slug))
}
