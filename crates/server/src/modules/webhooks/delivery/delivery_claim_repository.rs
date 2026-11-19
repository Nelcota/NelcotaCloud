use std::time::Duration;

use sqlx::PgPool;
use uuid::Uuid;

pub const LEASE_DURATION: Duration = Duration::from_secs(30);

#[derive(Clone, Copy, Debug, PartialEq, Eq, sqlx::FromRow)]
pub struct DeliveryLease {
    pub delivery_id: Uuid,
    pub token: Uuid,
}

#[derive(Debug, sqlx::FromRow)]
pub struct ClaimedDelivery {
    #[sqlx(flatten)]
    pub lease: DeliveryLease,
    pub event_id: Uuid,
    pub endpoint_id: Uuid,
    pub attempts: i32,
    pub payload: String,
}

/// Claims one due delivery per free endpoint. The transaction ends before any network send.
pub async fn claim_due_deliveries(
    pool: &PgPool,
    endpoint_ids: &[Uuid],
) -> Result<Vec<ClaimedDelivery>, sqlx::Error> {
    if endpoint_ids.is_empty() {
        return Ok(Vec::new());
    }

    let mut transaction = pool.begin().await?;
    // Serialize claims for each endpoint. A separate statement takes a fresh snapshot once
    // the locks are acquired, so simultaneous workers see leases committed by their peers.
    let locked_endpoints: Vec<Uuid> = sqlx::query_scalar(
        "SELECT endpoint_id FROM unnest($1::uuid[]) AS endpoint_id \
         WHERE pg_try_advisory_xact_lock(hashtextextended('webhook_endpoint:' || endpoint_id::text, 0))",
    )
    .bind(endpoint_ids)
    .fetch_all(&mut *transaction)
    .await?;
    let claimed = sqlx::query_as(CLAIM_DUE)
        .bind(&locked_endpoints)
        .bind(LEASE_DURATION.as_secs_f64())
        .fetch_all(&mut *transaction)
        .await?;
    transaction.commit().await?;

    Ok(claimed)
}

const CLAIM_DUE: &str = "
    WITH candidates AS MATERIALIZED (
        SELECT candidate.id
        FROM unnest($1::uuid[]) AS endpoint(endpoint_id)
        CROSS JOIN LATERAL (
            SELECT delivery.id
            FROM webhook_deliveries delivery
            WHERE delivery.endpoint_id = endpoint.endpoint_id
              AND delivery.delivered_at IS NULL AND delivery.failed_at IS NULL
              AND delivery.next_attempt_at <= statement_timestamp()
            ORDER BY delivery.next_attempt_at, delivery.id
            LIMIT 1
        ) candidate
        WHERE NOT EXISTS (
            SELECT 1 FROM webhook_deliveries leased
            WHERE leased.endpoint_id = endpoint.endpoint_id
              AND leased.lease_token IS NOT NULL
              AND leased.lease_expires_at > statement_timestamp()
        )
    ), locked AS (
        SELECT delivery.id FROM webhook_deliveries delivery JOIN candidates USING (id)
        WHERE delivery.delivered_at IS NULL AND delivery.failed_at IS NULL
          AND delivery.next_attempt_at <= statement_timestamp()
        FOR UPDATE OF delivery SKIP LOCKED
    ), claimed AS (
        UPDATE webhook_deliveries delivery
        SET lease_token = gen_random_uuid(),
            lease_expires_at = clock_timestamp() + $2::float8 * interval '1 second'
        FROM locked WHERE locked.id = delivery.id
        RETURNING delivery.id AS delivery_id, delivery.lease_token AS token, delivery.event_id,
                  delivery.endpoint_id, delivery.attempts
    )
    SELECT claimed.*, event.payload::text AS payload
    FROM claimed JOIN webhook_events event ON event.id = claimed.event_id";
