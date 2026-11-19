use std::time::Duration;

use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::webhooks::delivery::delivery_claim_repository::DeliveryLease;

/// Delivered and given-up events are kept this long for the delivery log, then deleted.
const RETENTION_DAYS: i32 = 7;
pub(crate) const ORPHANED_ERROR: &str = "the endpoint was deleted or disabled";

/// Gives up pending deliveries whose endpoint was deleted or disabled, so their payloads
/// (user data) expire with the rest and are never sent if the endpoint comes back.
///
/// Only deliveries created before `targets_loaded_at`: an endpoint created (or enabled) after
/// the targets were read is missing from `enabled_endpoint_ids`, and its deliveries wait for
/// the next run instead of being given up.
pub async fn abandon_orphaned_deliveries(
    pool: &PgPool,
    enabled_endpoint_ids: &[Uuid],
    targets_loaded_at: OffsetDateTime,
) -> Result<u64, sqlx::Error> {
    let abandoned = sqlx::query(
        "UPDATE webhook_deliveries SET failed_at = now(), last_error = $2, \
         lease_token = NULL, lease_expires_at = NULL \
         WHERE delivered_at IS NULL AND failed_at IS NULL AND endpoint_id <> ALL($1::uuid[]) \
         AND created_at < $3 AND (lease_expires_at IS NULL OR lease_expires_at <= clock_timestamp())",
    )
    .bind(enabled_endpoint_ids)
    .bind(ORPHANED_ERROR)
    .bind(targets_loaded_at)
    .execute(pool)
    .await?;

    Ok(abandoned.rows_affected())
}

/// What happened to one attempt, as the delivery log shows it.
pub struct AttemptResult<'a> {
    pub lease: DeliveryLease,
    pub status: Option<u16>,
    pub error: Option<&'a str>,
}

pub async fn mark_delivered(
    pool: &PgPool,
    lease: DeliveryLease,
    status: u16,
) -> Result<bool, sqlx::Error> {
    let update = sqlx::query(
        "UPDATE webhook_deliveries SET attempts = attempts + 1, last_attempt_at = clock_timestamp(), \
         last_response_status = $3, last_error = NULL, delivered_at = clock_timestamp(), \
         lease_token = NULL, lease_expires_at = NULL \
         WHERE id = $1 AND lease_token = $2 AND lease_expires_at > clock_timestamp()",
    )
    .bind(lease.delivery_id)
    .bind(lease.token)
    .bind(i32::from(status))
    .execute(pool)
    .await?;

    Ok(update.rows_affected() == 1)
}

/// `retry_in` is `None` when the delivery gives up.
pub async fn mark_failed(
    pool: &PgPool,
    attempt: AttemptResult<'_>,
    retry_in: Option<Duration>,
) -> Result<bool, sqlx::Error> {
    let retry_in_seconds = retry_in.map(|delay| delay.as_secs_f64());
    let update = sqlx::query(
        "UPDATE webhook_deliveries SET attempts = attempts + 1, last_attempt_at = clock_timestamp(), \
         last_response_status = $3, last_error = $4, \
         next_attempt_at = CASE WHEN $5::float8 IS NULL THEN next_attempt_at \
         ELSE clock_timestamp() + $5::float8 * interval '1 second' END, \
         failed_at = CASE WHEN $5::float8 IS NULL THEN clock_timestamp() END, \
         lease_token = NULL, lease_expires_at = NULL \
         WHERE id = $1 AND lease_token = $2 AND lease_expires_at > clock_timestamp()",
    )
    .bind(attempt.lease.delivery_id)
    .bind(attempt.lease.token)
    .bind(attempt.status.map(i32::from))
    .bind(attempt.error)
    .bind(retry_in_seconds)
    .execute(pool)
    .await?;

    Ok(update.rows_affected() == 1)
}

/// When the tenant next needs the worker.
///
/// A pending endpoint can run when its first delivery is due and its current lease has
/// expired. Finished events keep a retention deadline even after every endpoint is gone.
pub async fn next_due_at(pool: &PgPool) -> Result<Option<OffsetDateTime>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT LEAST( \
         (SELECT GREATEST(min(GREATEST(delivery.next_attempt_at, leased.expires_at)), now() + interval '1 second') \
         FROM webhook_deliveries delivery LEFT JOIN (SELECT endpoint_id, max(lease_expires_at) AS expires_at \
         FROM webhook_deliveries WHERE lease_token IS NOT NULL GROUP BY endpoint_id) leased USING (endpoint_id) \
         WHERE delivery.delivered_at IS NULL AND delivery.failed_at IS NULL HAVING count(*) > 0), \
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
