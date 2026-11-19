use std::collections::HashSet;

use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::storage::catalog::bucket_repository::lock_project;
use crate::shared::http::api_error::ApiError;

pub(crate) async fn reconcile_removed_owners(
    control: &PgPool,
    tenant_pool: &PgPool,
    tenant: Uuid,
) -> Result<(), ApiError> {
    let owners = sqlx::query_scalar::<_, Uuid>(
        "SELECT DISTINCT owner_id FROM storage_objects WHERE tenant_id = $1 AND owner_id IS NOT NULL",
    ).bind(tenant).fetch_all(control).await?;

    if owners.is_empty() {
        return Ok(());
    }

    let live: HashSet<_> = sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE id = ANY($1)")
        .bind(&owners)
        .fetch_all(tenant_pool)
        .await?
        .into_iter()
        .collect();
    let removed: Vec<_> = owners
        .into_iter()
        .filter(|owner| live.contains(owner) == false)
        .collect();

    if removed.is_empty() {
        return Ok(());
    }

    apply_user_erasure((control, tenant_pool), tenant, &removed).await
}

pub(crate) async fn drain_user_erasure(
    control: &PgPool,
    tenant_pool: &PgPool,
    tenant: Uuid,
) -> Result<(), ApiError> {
    let users = sqlx::query_scalar::<_, Uuid>(
        "SELECT user_id FROM storage_erasure_outbox ORDER BY enqueued_at, user_id LIMIT 100",
    )
    .fetch_all(tenant_pool)
    .await?;

    if users.is_empty() {
        return Ok(());
    }

    apply_user_erasure((control, tenant_pool), tenant, &users).await
}

pub(crate) async fn apply_user_erasure(
    pools: (&PgPool, &PgPool),
    tenant: Uuid,
    users: &[Uuid],
) -> Result<(), ApiError> {
    let (control, tenant_pool) = pools;
    enqueue_erasure(control, tenant, users).await?;
    sqlx::query("DELETE FROM storage_erasure_outbox WHERE user_id = ANY($1)")
        .bind(users)
        .execute(tenant_pool)
        .await?;

    Ok(())
}

async fn enqueue_erasure(control: &PgPool, tenant: Uuid, users: &[Uuid]) -> Result<(), ApiError> {
    let mut transaction = control.begin().await?;
    lock_project(&mut transaction, tenant).await?;
    sqlx::query(
        "INSERT INTO storage_erased_users (tenant_id, user_id)
         SELECT $1, user_id FROM unnest($2::uuid[]) AS user_id ON CONFLICT DO NOTHING",
    )
    .bind(tenant)
    .bind(users)
    .execute(&mut *transaction)
    .await?;
    sqlx::query("DELETE FROM storage_objects WHERE tenant_id = $1 AND owner_id = ANY($2)")
        .bind(tenant)
        .bind(users)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;

    Ok(())
}
