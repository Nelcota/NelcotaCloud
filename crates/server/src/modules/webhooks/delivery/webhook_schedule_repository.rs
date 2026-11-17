use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

/// A tenant with deliveries due, and the database time it was read at.
#[derive(sqlx::FromRow)]
pub struct DueTenant {
    pub tenant_id: Uuid,
    pub checked_at: OffsetDateTime,
}

/// Marks tenants as due now, keeping an earlier time if one is already set.
pub async fn mark_due_now(pool: &PgPool, tenant_ids: &[Uuid]) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO webhook_schedule (tenant_id, next_due_at) \
         SELECT tenant_id, now() FROM UNNEST($1::uuid[]) AS tenant_id \
         WHERE EXISTS (SELECT 1 FROM tenants WHERE tenants.id = tenant_id) \
         ON CONFLICT (tenant_id) DO UPDATE SET next_due_at = LEAST(webhook_schedule.next_due_at, EXCLUDED.next_due_at)",
    )
    .bind(tenant_ids)
    .execute(pool)
    .await?;

    Ok(())
}

/// Marks every tenant with an enabled endpoint as due, so events whose wake-up hint was lost
/// (a crash right after the commit, a full channel) are still delivered.
pub async fn mark_tenants_with_endpoints_due(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO webhook_schedule (tenant_id, next_due_at) \
         SELECT DISTINCT tenant_id, now() FROM webhook_endpoints WHERE is_enabled \
         ON CONFLICT (tenant_id) DO NOTHING",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn due_tenants(pool: &PgPool, limit: i64) -> Result<Vec<DueTenant>, sqlx::Error> {
    sqlx::query_as(
        "SELECT tenant_id, now() AS checked_at FROM webhook_schedule WHERE next_due_at <= now() \
         ORDER BY next_due_at LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
}

/// How long until the next tenant is due; `None` when nothing is scheduled.
pub async fn time_until_next_due(pool: &PgPool) -> Result<Option<f64>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT GREATEST(EXTRACT(EPOCH FROM min(next_due_at) - now()), 0)::float8 FROM webhook_schedule \
         HAVING count(*) > 0",
    )
    .fetch_optional(pool)
    .await
}

/// After a tenant was processed: sets its next due time, or removes it when nothing is
/// pending. A hint that arrived during the run (a due time after `checked_at`) is kept.
pub async fn reschedule(
    pool: &PgPool,
    due: &DueTenant,
    next_due_at: Option<OffsetDateTime>,
) -> Result<(), sqlx::Error> {
    let Some(next_due_at) = next_due_at else {
        sqlx::query("DELETE FROM webhook_schedule WHERE tenant_id = $1 AND next_due_at <= $2")
            .bind(due.tenant_id)
            .bind(due.checked_at)
            .execute(pool)
            .await?;
        return Ok(());
    };

    sqlx::query(
        "INSERT INTO webhook_schedule (tenant_id, next_due_at) VALUES ($1, $3) \
         ON CONFLICT (tenant_id) DO UPDATE SET next_due_at = CASE WHEN webhook_schedule.next_due_at > $2 \
         THEN LEAST(webhook_schedule.next_due_at, EXCLUDED.next_due_at) ELSE EXCLUDED.next_due_at END",
    )
    .bind(due.tenant_id)
    .bind(due.checked_at)
    .bind(next_due_at)
    .execute(pool)
    .await?;

    Ok(())
}
