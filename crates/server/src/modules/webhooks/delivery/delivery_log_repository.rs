use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, sqlx::Type)]
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
    /// How long the receiver took to answer the last attempt; `null` when it never answered.
    pub last_duration_ms: Option<i32>,
    /// The start (512 bytes at most) of the receiver's answer when it refused the last attempt.
    pub last_response_body: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339::option")]
    pub last_attempt_at: Option<OffsetDateTime>,
    /// When the next retry happens; `null` unless pending.
    #[serde(with = "time::serde::rfc3339::option")]
    pub next_attempt_at: Option<OffsetDateTime>,
}

/// One page of an endpoint's log, newest first: optionally one state only, and only deliveries
/// older than `before` (the last delivery of the previous page).
pub struct DeliveryLogQuery {
    pub endpoint_id: Uuid,
    pub status: Option<DeliveryStatus>,
    pub before: Option<Uuid>,
    pub limit: i64,
}

pub async fn list_deliveries(
    pool: &PgPool,
    query: DeliveryLogQuery,
) -> Result<Vec<DeliveryLogEntry>, sqlx::Error> {
    sqlx::query_as(
        "SELECT delivery.id, delivery.event_id, event.event_type,          CASE WHEN delivery.delivered_at IS NOT NULL THEN 'delivered'          WHEN delivery.failed_at IS NOT NULL THEN 'failed' ELSE 'pending' END AS status,          delivery.attempts, delivery.last_response_status, delivery.last_error,          delivery.last_duration_ms, delivery.last_response_body, delivery.created_at,          delivery.last_attempt_at,          CASE WHEN delivery.delivered_at IS NULL AND delivery.failed_at IS NULL THEN delivery.next_attempt_at END AS next_attempt_at          FROM webhook_deliveries delivery JOIN webhook_events event ON event.id = delivery.event_id          WHERE delivery.endpoint_id = $1          AND ($2::text IS NULL            OR ($2 = 'delivered' AND delivery.delivered_at IS NOT NULL)            OR ($2 = 'failed' AND delivery.delivered_at IS NULL AND delivery.failed_at IS NOT NULL)            OR ($2 = 'pending' AND delivery.delivered_at IS NULL AND delivery.failed_at IS NULL))          AND ($3::uuid IS NULL OR (delivery.created_at, delivery.id) <            (SELECT previous.created_at, previous.id FROM webhook_deliveries previous             WHERE previous.id = $3 AND previous.endpoint_id = $1))          ORDER BY delivery.created_at DESC, delivery.id DESC LIMIT $4",
    )
    .bind(query.endpoint_id)
    .bind(query.status)
    .bind(query.before)
    .bind(query.limit)
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
/// A delivery with a live lease is reported as in progress without waiting for the send.
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
         attempts = 0, lease_token = NULL, lease_expires_at = NULL \
         WHERE id = (SELECT id FROM webhook_deliveries WHERE id = $1 AND endpoint_id = $2 \
         AND (lease_expires_at IS NULL OR lease_expires_at <= clock_timestamp()) \
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
