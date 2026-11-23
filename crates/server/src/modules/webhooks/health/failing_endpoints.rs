use std::time::Duration;

use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::webhooks::scheduling::webhook_schedule_repository::mark_due_now;

/// Long enough to ride out a deploy or a short outage, short enough to act the same day.
pub const ALERT_AFTER: Duration = Duration::from_secs(6 * 60 * 60);
/// After this long every delivery has given up anyway (retries last about 28 hours): pausing
/// stops sending new events into a receiver nobody fixed.
pub const PAUSE_AFTER: Duration = Duration::from_secs(5 * 24 * 60 * 60);
/// Endpoints handled per sweep, so one sweep stays short; the next one takes the rest.
const SWEEP_BATCH: i64 = 50;

/// An endpoint whose run of failures crossed a threshold.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct FailingEndpoint {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub failing_since: OffsetDateTime,
}

/// Marks the owners as told about endpoints failing for longer than `ALERT_AFTER`, and returns
/// them for the alert. Claimed in one statement, so two API instances never alert twice.
pub async fn claim_failure_alerts(pool: &PgPool) -> Result<Vec<FailingEndpoint>, sqlx::Error> {
    sqlx::query_as(
        "UPDATE webhook_endpoints SET failure_alerted_at = now() WHERE id IN ( \
         SELECT id FROM webhook_endpoints WHERE is_enabled AND failure_alerted_at IS NULL \
         AND failing_since < now() - $1::float8 * interval '1 second' \
         ORDER BY failing_since LIMIT $2 FOR UPDATE SKIP LOCKED) \
         RETURNING id, tenant_id, failing_since",
    )
    .bind(ALERT_AFTER.as_secs_f64())
    .bind(SWEEP_BATCH)
    .fetch_all(pool)
    .await
}

/// An alert that could not be sent is claimed again by the next sweep.
pub async fn release_failure_alert(pool: &PgPool, endpoint_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE webhook_endpoints SET failure_alerted_at = NULL WHERE id = $1")
        .bind(endpoint_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Disables endpoints failing for longer than `PAUSE_AFTER` and returns them. Their pending
/// deliveries are given up on the worker's next look, as when an owner disables one.
pub async fn pause_failing_endpoints(pool: &PgPool) -> Result<Vec<FailingEndpoint>, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    let paused: Vec<FailingEndpoint> = sqlx::query_as(
        "UPDATE webhook_endpoints SET is_enabled = false, auto_paused_at = now(), updated_at = now() \
         WHERE id IN (SELECT id FROM webhook_endpoints WHERE is_enabled \
         AND failing_since < now() - $1::float8 * interval '1 second' \
         ORDER BY failing_since LIMIT $2 FOR UPDATE SKIP LOCKED) \
         RETURNING id, tenant_id, failing_since",
    )
    .bind(PAUSE_AFTER.as_secs_f64())
    .bind(SWEEP_BATCH)
    .fetch_all(&mut *transaction)
    .await?;
    let tenant_ids: Vec<Uuid> = paused.iter().map(|endpoint| endpoint.tenant_id).collect();

    if tenant_ids.is_empty() == false {
        mark_due_now(&mut *transaction, &tenant_ids).await?;
    }

    transaction.commit().await?;

    Ok(paused)
}
