use sqlx::PgPool;
use uuid::Uuid;

/// Queues every given-up delivery of the endpoint again, right away (e.g. after fixing the
/// receiver), and returns how many. Deliveries still kept are at most 7 days old.
pub async fn requeue_failed_deliveries(
    pool: &PgPool,
    endpoint_id: Uuid,
) -> Result<u64, sqlx::Error> {
    let requeued = sqlx::query(
        "UPDATE webhook_deliveries SET failed_at = NULL, next_attempt_at = now(), attempts = 0, \
         lease_token = NULL, lease_expires_at = NULL \
         WHERE endpoint_id = $1 AND failed_at IS NOT NULL AND delivered_at IS NULL \
         AND (lease_expires_at IS NULL OR lease_expires_at <= clock_timestamp())",
    )
    .bind(endpoint_id)
    .execute(pool)
    .await?;

    Ok(requeued.rows_affected())
}
