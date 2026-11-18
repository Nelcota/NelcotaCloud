use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

/// The newest deliveries are what owners look at when a receiver misbehaves.
const DELIVERY_LOG_LIMIT: i64 = 50;

#[derive(Debug, Clone, Copy, Serialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "text", rename_all = "snake_case")]
pub enum DeliveryStatus {
    /// Waiting for its first attempt or for a retry.
    Pending,
    Delivered,
    /// Every retry failed, or the endpoint was deleted or disabled.
    Failed,
}

/// One delivery as the delivery log shows it. The payload is not included: it has personal
/// data and is already in the receiver's hands.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct DeliveryLogEntry {
    pub id: Uuid,
    pub event_id: Uuid,
    pub event_type: String,
    pub status: DeliveryStatus,
    pub attempts: i32,
    pub last_response_status: Option<i32>,
    pub last_error: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339::option")]
    pub last_attempt_at: Option<OffsetDateTime>,
    /// When the next retry happens; `null` unless pending.
    #[serde(with = "time::serde::rfc3339::option")]
    pub next_attempt_at: Option<OffsetDateTime>,
}

pub async fn list_deliveries(
    pool: &PgPool,
    endpoint_id: Uuid,
) -> Result<Vec<DeliveryLogEntry>, sqlx::Error> {
    sqlx::query_as(
        "SELECT delivery.id, delivery.event_id, event.event_type, \
         CASE WHEN delivery.delivered_at IS NOT NULL THEN 'delivered' \
         WHEN delivery.failed_at IS NOT NULL THEN 'failed' ELSE 'pending' END AS status, \
         delivery.attempts, delivery.last_response_status, delivery.last_error, delivery.created_at, \
         delivery.last_attempt_at, \
         CASE WHEN delivery.delivered_at IS NULL AND delivery.failed_at IS NULL THEN delivery.next_attempt_at END AS next_attempt_at \
         FROM webhook_deliveries delivery JOIN webhook_events event ON event.id = delivery.event_id \
         WHERE delivery.endpoint_id = $1 ORDER BY delivery.created_at DESC LIMIT $2",
    )
    .bind(endpoint_id)
    .bind(DELIVERY_LOG_LIMIT)
    .fetch_all(pool)
    .await
}

/// What happened to a request to send a delivery again.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Requeue {
    Queued,
    /// The worker is sending it right now; asking again later is enough.
    InProgress,
    NotFound,
}

/// Queues the delivery again right away, whatever its state (e.g. after fixing the receiver).
/// A delivery the worker is sending is locked: it is reported, never waited for.
pub async fn requeue_delivery(
    pool: &PgPool,
    endpoint_id: Uuid,
    delivery_id: Uuid,
) -> Result<Requeue, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM webhook_deliveries WHERE id = $1 AND endpoint_id = $2)",
    )
    .bind(delivery_id)
    .bind(endpoint_id)
    .fetch_one(&mut *transaction)
    .await?;

    if exists == false {
        return Ok(Requeue::NotFound);
    }

    let updated = sqlx::query(
        "UPDATE webhook_deliveries SET delivered_at = NULL, failed_at = NULL, next_attempt_at = now(), \
         attempts = 0 WHERE id = (SELECT id FROM webhook_deliveries WHERE id = $1 AND endpoint_id = $2 \
         FOR UPDATE SKIP LOCKED)",
    )
    .bind(delivery_id)
    .bind(endpoint_id)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    if updated.rows_affected() == 0 {
        return Ok(Requeue::InProgress);
    }

    Ok(Requeue::Queued)
}
