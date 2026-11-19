use std::time::Duration;

use sqlx::PgPool;
use tokio::sync::watch;
use tokio::time::{MissedTickBehavior, interval};

use crate::modules::storage::object_store::object_key::ObjectKey;
use crate::modules::storage::object_store::r2_store::R2Store;

const CLEANUP_INTERVAL: Duration = Duration::from_secs(5);

pub async fn run_cleanup(pool: PgPool, store: R2Store, mut stop: watch::Receiver<bool>) {
    let mut ticks = interval(CLEANUP_INTERVAL);
    let mut reporting = interval(Duration::from_secs(60));
    ticks.set_missed_tick_behavior(MissedTickBehavior::Skip);
    reporting.set_missed_tick_behavior(MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            _ = stop.changed() => return,
            _ = reporting.tick() => {
                if let Err(error) = report_backlog(&pool, store.location()).await {
                    tracing::warn!(%error, "could not measure object storage cleanup backlog");
                }
            }
            _ = ticks.tick() => {
                if let Err(error) = cleanup_batch(&pool, &store).await {
                    tracing::error!(%error, "could not process storage cleanup");
                }
            }
        }
    }
}

async fn cleanup_batch(pool: &PgPool, store: &R2Store) -> Result<(), sqlx::Error> {
    expire_uploads(pool).await?;
    let keys = claim_deletions(pool, store.location()).await?;

    if keys.is_empty() {
        return Ok(());
    }

    let removed = match store.delete_batch(&keys).await {
        Ok(removed) => removed,
        Err(_) => return Ok(()),
    };
    sqlx::query("DELETE FROM storage_object_deletions WHERE id = ANY($1)")
        .bind(&removed)
        .execute(pool)
        .await?;
    let failed = keys.len().saturating_sub(removed.len());
    tracing::debug!(
        deleted = removed.len(),
        failed,
        "processed object storage deletion batch"
    );

    if failed > 0 {
        tracing::warn!(failed, "object storage deletions will be retried");
    }

    Ok(())
}

async fn report_backlog(pool: &PgPool, location: &str) -> Result<(), sqlx::Error> {
    let (queued, oldest_age_seconds, unmatched) = sqlx::query_as::<_, (i64, i64, i64)>(
        "SELECT count(*) FILTER (WHERE location = $1),
                COALESCE(EXTRACT(EPOCH FROM now() - min(queued_at) FILTER (WHERE location = $1)), 0)::bigint,
                count(*) FILTER (WHERE location IS DISTINCT FROM $1)
         FROM storage_object_deletions",
    )
    .bind(location)
    .fetch_one(pool)
    .await?;
    tracing::debug!(
        queued,
        oldest_age_seconds,
        unmatched,
        "object storage cleanup backlog"
    );

    if unmatched > 0 {
        tracing::warn!(
            unmatched,
            "object storage deletions require their original location"
        );
    }

    Ok(())
}

async fn expire_uploads(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM storage_objects WHERE id IN (
            SELECT id FROM storage_objects WHERE is_ready = false AND confirm_until <= now()
            ORDER BY confirm_until LIMIT 250 FOR UPDATE SKIP LOCKED
        )",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub(crate) async fn prune_erasure_guards(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Requests have a one-minute hard deadline; keep guards longer than any in-flight reservation.
    sqlx::query(
        "DELETE FROM storage_erased_users WHERE (tenant_id, user_id) IN (
            SELECT tenant_id, user_id FROM storage_erased_users WHERE erased_at < now() - interval '1 day'
            ORDER BY erased_at LIMIT 250 FOR UPDATE SKIP LOCKED
        )",
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn claim_deletions(pool: &PgPool, location: &str) -> Result<Vec<ObjectKey>, sqlx::Error> {
    sqlx::query_as(
        "UPDATE storage_object_deletions SET next_attempt_at = now() + interval '2 minutes' WHERE id IN (
            SELECT id FROM storage_object_deletions WHERE location = $1 AND next_attempt_at <= now()
            ORDER BY next_attempt_at, id LIMIT 250 FOR UPDATE SKIP LOCKED
        ) RETURNING id, tenant_id, bucket_id",
    )
    .bind(location)
    .fetch_all(pool)
    .await
}

pub async fn adopt_legacy_location(pool: &PgPool, location: &str) -> Result<(), sqlx::Error> {
    let mut transaction = pool.begin().await?;
    sqlx::query("UPDATE storage_buckets SET location = $1 WHERE location IS NULL")
        .bind(location)
        .execute(&mut *transaction)
        .await?;
    sqlx::query("UPDATE storage_objects SET location = $1 WHERE location IS NULL")
        .bind(location)
        .execute(&mut *transaction)
        .await?;
    sqlx::query("UPDATE storage_object_deletions SET location = $1 WHERE location IS NULL")
        .bind(location)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;

    Ok(())
}

pub async fn has_unbound_data(pool: &PgPool, location: &str) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM storage_objects WHERE location IS DISTINCT FROM $1)
            OR EXISTS (SELECT 1 FROM storage_object_deletions WHERE location IS DISTINCT FROM $1)",
    )
    .bind(location)
    .fetch_one(pool)
    .await
}
