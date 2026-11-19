use sqlx::PgPool;

pub const RETENTION_DAYS: i32 = 90;
pub const WEBHOOK_MAX_AGE_MINUTES: i32 = 60;
const RETENTION_BATCH: i64 = 1_000;
const MAX_BATCHES_PER_TENANT: usize = 16;

const PRUNE_ACTIVITY: &str = "WITH expired AS (SELECT id FROM audit_events \
     WHERE occurred_at < now() - make_interval(days => $1) \
     ORDER BY occurred_at LIMIT $2 FOR UPDATE SKIP LOCKED) \
     DELETE FROM audit_events USING expired WHERE audit_events.id = expired.id";

const PRUNE_PENDING: &str = "WITH expired AS (SELECT event_id FROM audit_webhook_pending \
     WHERE occurred_at <= now() - make_interval(mins => $1) \
     ORDER BY occurred_at, event_id LIMIT $2 FOR UPDATE SKIP LOCKED) \
     DELETE FROM audit_webhook_pending pending USING expired \
     WHERE pending.event_id = expired.event_id";

pub async fn prune_expired_audit(pool: &PgPool) -> Result<(), sqlx::Error> {
    for _ in 0..MAX_BATCHES_PER_TENANT {
        let activity = prune_batch(pool, PRUNE_ACTIVITY, RETENTION_DAYS).await?;
        let pending = prune_batch(pool, PRUNE_PENDING, WEBHOOK_MAX_AGE_MINUTES).await?;

        if activity < RETENTION_BATCH.unsigned_abs() && pending < RETENTION_BATCH.unsigned_abs() {
            return Ok(());
        }
    }

    Ok(())
}

async fn prune_batch(pool: &PgPool, statement: &'static str, age: i32) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(statement)
        .bind(age)
        .bind(RETENTION_BATCH)
        .execute(pool)
        .await?;

    Ok(result.rows_affected())
}
