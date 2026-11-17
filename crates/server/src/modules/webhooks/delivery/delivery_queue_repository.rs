use std::time::Duration;

use serde_json::Value;
use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

/// Delivered and given-up events are kept this long for the delivery log, then deleted.
const RETENTION_DAYS: i32 = 7;
/// Two deliveries of one endpoint per batch, each bounded by the request timeout.
const PER_ENDPOINT_IN_BATCH: i64 = 2;
const ORPHANED_ERROR: &str = "the endpoint was deleted or disabled";

/// A pending delivery locked by this worker's transaction until it commits. Other workers
/// skip it; if this one dies, the lock goes away with its connection.
#[derive(sqlx::FromRow)]
pub struct ClaimedDelivery {
    pub id: Uuid,
    pub event_id: Uuid,
    pub endpoint_id: Uuid,
    pub attempts: i32,
    pub payload: Value,
}

/// Claims due deliveries, at most `PER_ENDPOINT_IN_BATCH` per endpoint: the batch's
/// transaction stays open while sending, so one slow receiver must not hold it for long.
pub async fn claim_due_deliveries(
    connection: &mut PgConnection,
    limit: i64,
) -> Result<Vec<ClaimedDelivery>, sqlx::Error> {
    sqlx::query_as(
        "SELECT delivery.id, delivery.event_id, delivery.endpoint_id, delivery.attempts, event.payload \
         FROM webhook_deliveries delivery JOIN webhook_events event ON event.id = delivery.event_id \
         WHERE delivery.id IN (SELECT ranked.id FROM (SELECT id, next_attempt_at, row_number() OVER \
         (PARTITION BY endpoint_id ORDER BY next_attempt_at) AS position FROM webhook_deliveries \
         WHERE delivered_at IS NULL AND failed_at IS NULL AND next_attempt_at <= now()) ranked \
         WHERE ranked.position <= $2 ORDER BY ranked.next_attempt_at LIMIT $1) \
         ORDER BY delivery.next_attempt_at FOR UPDATE OF delivery SKIP LOCKED",
    )
    .bind(limit)
    .bind(PER_ENDPOINT_IN_BATCH)
    .fetch_all(connection)
    .await
}

/// Gives up pending deliveries whose endpoint was deleted or disabled, so their payloads
/// (user data) expire with the rest and are never sent if the endpoint comes back.
pub async fn abandon_orphaned_deliveries(
    pool: &PgPool,
    enabled_endpoint_ids: &[Uuid],
) -> Result<u64, sqlx::Error> {
    let abandoned = sqlx::query(
        "UPDATE webhook_deliveries SET failed_at = now(), last_error = $2 \
         WHERE delivered_at IS NULL AND failed_at IS NULL AND endpoint_id <> ALL($1::uuid[])",
    )
    .bind(enabled_endpoint_ids)
    .bind(ORPHANED_ERROR)
    .execute(pool)
    .await?;

    Ok(abandoned.rows_affected())
}

/// What happened to one attempt, as the delivery log shows it.
pub struct AttemptResult<'a> {
    pub delivery_id: Uuid,
    pub status: Option<u16>,
    pub error: Option<&'a str>,
}

pub async fn mark_delivered(
    connection: &mut PgConnection,
    attempt: AttemptResult<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE webhook_deliveries SET attempts = attempts + 1, last_attempt_at = now(), \
         last_response_status = $2, last_error = NULL, delivered_at = now() WHERE id = $1",
    )
    .bind(attempt.delivery_id)
    .bind(attempt.status.map(i32::from))
    .execute(connection)
    .await?;

    Ok(())
}

/// `retry_in` is `None` when the delivery gives up.
pub async fn mark_failed(
    connection: &mut PgConnection,
    attempt: AttemptResult<'_>,
    retry_in: Option<Duration>,
) -> Result<(), sqlx::Error> {
    let retry_in_seconds = retry_in.map(|delay| delay.as_secs_f64());
    sqlx::query(
        "UPDATE webhook_deliveries SET attempts = attempts + 1, last_attempt_at = now(), \
         last_response_status = $2, last_error = $3, \
         next_attempt_at = CASE WHEN $4::float8 IS NULL THEN next_attempt_at \
         ELSE now() + $4::float8 * interval '1 second' END, \
         failed_at = CASE WHEN $4::float8 IS NULL THEN now() END WHERE id = $1",
    )
    .bind(attempt.delivery_id)
    .bind(attempt.status.map(i32::from))
    .bind(attempt.error)
    .bind(retry_in_seconds)
    .execute(connection)
    .await?;

    Ok(())
}

/// When the tenant next needs the worker.
///
/// Its next pending delivery (never earlier than a second from now, so deliveries locked by
/// another worker cannot make it spin), or the day its oldest finished event expires, so
/// retention runs even after every endpoint is gone.
pub async fn next_due_at(pool: &PgPool) -> Result<Option<OffsetDateTime>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT LEAST( \
         (SELECT GREATEST(min(next_attempt_at), now() + interval '1 second') \
         FROM webhook_deliveries WHERE delivered_at IS NULL AND failed_at IS NULL HAVING count(*) > 0), \
         (SELECT min(event.created_at) + $1::int * interval '1 day' + interval '1 minute' \
         FROM webhook_events event WHERE NOT EXISTS (SELECT 1 FROM webhook_deliveries delivery \
         WHERE delivery.event_id = event.id AND delivery.delivered_at IS NULL AND delivery.failed_at IS NULL)))",
    )
    .bind(RETENTION_DAYS)
    .fetch_one(pool)
    .await
}

pub async fn delete_expired_events(pool: &PgPool) -> Result<u64, sqlx::Error> {
    let deleted = sqlx::query(
        "DELETE FROM webhook_events event WHERE event.created_at < now() - $1::int * interval '1 day' \
         AND NOT EXISTS (SELECT 1 FROM webhook_deliveries delivery WHERE delivery.event_id = event.id \
         AND delivery.delivered_at IS NULL AND delivery.failed_at IS NULL)",
    )
    .bind(RETENTION_DAYS)
    .execute(pool)
    .await?;

    Ok(deleted.rows_affected())
}
