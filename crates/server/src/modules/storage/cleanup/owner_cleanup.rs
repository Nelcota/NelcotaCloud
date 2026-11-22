use std::sync::Arc;
use std::time::Duration;

use sqlx::{PgExecutor, PgPool};
use time::OffsetDateTime;
use tokio::sync::watch;
use tokio::time::{MissedTickBehavior, interval, timeout};
use uuid::Uuid;

use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::shared::http::api_error::ApiError;

const POLL_INTERVAL: Duration = Duration::from_secs(15);
const JOB_TIMEOUT: Duration = Duration::from_secs(5);

/// Queue before committing the user deletion. The worker checks that the user is gone and
/// waits for earlier authorized HTTP requests to end before deleting their catalog entries.
pub async fn schedule_owner_removal<'e>(
    executor: impl PgExecutor<'e>,
    (tenant, user): (Uuid, Uuid),
) -> Result<(), ApiError> {
    sqlx::query(
        "INSERT INTO storage_owner_deletions (tenant_id, owner_id, next_attempt_at)
         VALUES ($1, $2, clock_timestamp() + interval '90 seconds')
         ON CONFLICT (tenant_id, owner_id) DO UPDATE SET next_attempt_at = EXCLUDED.next_attempt_at",
    )
    .bind(tenant)
    .bind(user)
    .execute(executor)
    .await?;

    Ok(())
}

#[derive(sqlx::FromRow)]
struct OwnerRemoval {
    tenant_id: Uuid,
    owner_id: Uuid,
    next_attempt_at: OffsetDateTime,
}

pub async fn run_owner_cleanup(
    pool: PgPool,
    tenant_pools: Arc<TenantPoolRegistry>,
    mut stop: watch::Receiver<bool>,
) {
    let mut ticks = interval(POLL_INTERVAL);
    ticks.set_missed_tick_behavior(MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            biased;
            _ = stop.changed() => return,
            _ = ticks.tick() => {}
        }

        match claim_owner_removals(&pool).await {
            Ok(removals) => {
                for removal in removals {
                    if *stop.borrow() {
                        return;
                    }

                    match timeout(
                        JOB_TIMEOUT,
                        remove_owner_files(&pool, &tenant_pools, &removal),
                    )
                    .await
                    {
                        Ok(Ok(())) => {}
                        Ok(Err(error)) => {
                            tracing::warn!(%error, "storage owner cleanup will be retried")
                        }
                        Err(_) => tracing::warn!("storage owner cleanup timed out"),
                    }
                }
            }
            Err(error) => tracing::error!(%error, "could not load storage owner cleanup batch"),
        }
    }
}

async fn claim_owner_removals(pool: &PgPool) -> Result<Vec<OwnerRemoval>, sqlx::Error> {
    sqlx::query_as(
        "UPDATE storage_owner_deletions SET next_attempt_at = clock_timestamp() + interval '2 minutes'
         WHERE (tenant_id, owner_id) IN (
            SELECT tenant_id, owner_id FROM storage_owner_deletions WHERE next_attempt_at <= now()
            ORDER BY next_attempt_at LIMIT 16 FOR UPDATE SKIP LOCKED
         ) RETURNING tenant_id, owner_id, next_attempt_at",
    )
    .fetch_all(pool)
    .await
}

async fn remove_owner_files(
    pool: &PgPool,
    tenant_pools: &TenantPoolRegistry,
    removal: &OwnerRemoval,
) -> Result<(), ApiError> {
    let tenant = tenant_pools
        .pool_for(removal.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let exists: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)")
        .bind(removal.owner_id)
        .fetch_one(&tenant)
        .await?;

    let mut transaction = pool.begin().await?;
    let acknowledged = sqlx::query(
        "DELETE FROM storage_owner_deletions
         WHERE tenant_id = $1 AND owner_id = $2 AND next_attempt_at = $3",
    )
    .bind(removal.tenant_id)
    .bind(removal.owner_id)
    .bind(removal.next_attempt_at)
    .execute(&mut *transaction)
    .await?;

    if exists == false && acknowledged.rows_affected() != 0 {
        sqlx::query("DELETE FROM storage_objects WHERE tenant_id = $1 AND owner_id = $2")
            .bind(removal.tenant_id)
            .bind(removal.owner_id)
            .execute(&mut *transaction)
            .await?;
    }

    transaction.commit().await?;

    Ok(())
}
