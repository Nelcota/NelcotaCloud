use std::time::Duration;

use serde_json::Value;
use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

/// Delivered and given-up events are kept this long for the delivery log, then deleted.
const RETENTION_DAYS: i32 = 7;

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

pub async fn claim_due_deliveries(
    connection: &mut PgConnection,
    limit: i64,
) -> Result<Vec<ClaimedDelivery>, sqlx::Error> {
    sqlx::query_as(
        "SELECT delivery.id, delivery.event_id, delivery.endpoint_id, delivery.attempts, event.payload \
         FROM webhook_deliveries delivery JOIN webhook_events event ON event.id = delivery.event_id \
         WHERE delivery.delivered_at IS NULL AND delivery.failed_at IS NULL AND delivery.next_attempt_at <= now() \
         ORDER BY delivery.next_attempt_at LIMIT $1 FOR UPDATE OF delivery SKIP LOCKED",
    )
    .bind(limit)
    .fetch_all(connection)
    .await
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
    let retry_in_millis = retry_in.and_then(|delay| i64::try_from(delay.as_millis()).ok());
    sqlx::query(
        "UPDATE webhook_deliveries SET attempts = attempts + 1, last_attempt_at = now(), \
         last_response_status = $2, last_error = $3, \
         next_attempt_at = CASE WHEN $4::bigint IS NULL THEN next_attempt_at ELSE now() + $4::bigint * interval '1 millisecond' END, \
         failed_at = CASE WHEN $4::bigint IS NULL THEN now() END WHERE id = $1",
    )
    .bind(attempt.delivery_id)
    .bind(attempt.status.map(i32::from))
    .bind(attempt.error)
    .bind(retry_in_millis)
    .execute(connection)
    .await?;

    Ok(())
}

/// When the tenant next has a delivery due, never earlier than a second from now: deliveries
/// locked by another worker are still pending, and the worker must not spin on them.
pub async fn next_due_at(pool: &PgPool) -> Result<Option<OffsetDateTime>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT GREATEST(min(next_attempt_at), now() + interval '1 second') FROM webhook_deliveries \
         WHERE delivered_at IS NULL AND failed_at IS NULL HAVING count(*) > 0",
    )
    .fetch_optional(pool)
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
