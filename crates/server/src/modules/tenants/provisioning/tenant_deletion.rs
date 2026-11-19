use sqlx::{PgConnection, PgExecutor, PgPool};
use uuid::Uuid;

use crate::modules::tenants::platform::membership_repository::MembershipError;
use crate::modules::tenants::provisioning::tenant_repository::lock_slug;
use crate::modules::tenants::provisioning::tenant_slug::{InvalidTenantSlug, TenantSlug};

#[derive(Debug, thiserror::Error)]
pub enum TenantDeletionError {
    #[error("database error while deleting tenant: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored tenant slug is invalid: {0}")]
    InvalidSlug(#[from] InvalidTenantSlug),
    #[error(transparent)]
    Membership(#[from] MembershipError),
}

/// Retires access to the tenant and reserves its slug in the same transaction.
pub async fn stage_deletion(
    transaction: &mut PgConnection,
    tenant_id: Uuid,
    requested_by: Option<Uuid>,
) -> Result<bool, TenantDeletionError> {
    let raw_slug: Option<String> =
        sqlx::query_scalar("SELECT slug FROM tenants WHERE id = $1 FOR UPDATE")
            .bind(tenant_id)
            .fetch_optional(&mut *transaction)
            .await?;
    let raw_slug = match raw_slug {
        Some(raw_slug) => raw_slug,
        None => return Ok(false),
    };
    let slug = TenantSlug::parse(&raw_slug)?;
    lock_slug(transaction, &slug).await?;
    sqlx::query(
        "INSERT INTO pending_tenant_deletions (tenant_id, slug, requested_by) VALUES ($1, $2, $3)",
    )
    .bind(tenant_id)
    .bind(slug.as_str())
    .bind(requested_by)
    .execute(&mut *transaction)
    .await?;
    sqlx::query("DELETE FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .execute(&mut *transaction)
        .await?;

    Ok(true)
}

pub async fn pending_slug(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Option<TenantSlug>, TenantDeletionError> {
    let raw_slug: Option<String> =
        sqlx::query_scalar("SELECT slug FROM pending_tenant_deletions WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_optional(pool)
            .await?;

    Ok(raw_slug.as_deref().map(TenantSlug::parse).transpose()?)
}

pub async fn is_pending<'e>(
    executor: impl PgExecutor<'e>,
    tenant_id: Uuid,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM pending_tenant_deletions WHERE tenant_id = $1)",
    )
    .bind(tenant_id)
    .fetch_one(executor)
    .await
}

pub async fn requested_by(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    account_id: Uuid,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM pending_tenant_deletions WHERE tenant_id = $1 AND requested_by = $2)",
    )
    .bind(tenant_id)
    .bind(account_id)
    .fetch_one(connection)
    .await
}

pub async fn complete_deletion(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM pending_tenant_deletions WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(connection)
        .await?;

    Ok(())
}

pub async fn pending_deletions(pool: &PgPool) -> Result<Vec<Uuid>, sqlx::Error> {
    const BATCH_SIZE: i64 = 16;
    sqlx::query_scalar(
        "SELECT tenant_id FROM pending_tenant_deletions WHERE next_attempt_at <= now() \
         ORDER BY next_attempt_at, tenant_id LIMIT $1",
    )
    .bind(BATCH_SIZE)
    .fetch_all(pool)
    .await
}

pub async fn postpone_deletion(pool: &PgPool, tenant_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE pending_tenant_deletions SET next_attempt_at = now() + interval '1 minute' WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .execute(pool)
    .await?;

    Ok(())
}
