use sqlx::PgPool;
use uuid::Uuid;

/// An accepted delivery ends the endpoint's run of failures, and with it any alert sent about
/// it. Writes only when there was a run, so healthy endpoints cost no write per delivery.
pub async fn record_endpoint_success(pool: &PgPool, endpoint_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE webhook_endpoints SET failing_since = NULL, failure_alerted_at = NULL \
         WHERE id = $1 AND failing_since IS NOT NULL",
    )
    .bind(endpoint_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// The first refused attempt after a success starts the endpoint's run of failures; later ones
/// keep its start.
pub async fn record_endpoint_failure(pool: &PgPool, endpoint_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE webhook_endpoints SET failing_since = now() WHERE id = $1 AND failing_since IS NULL",
    )
    .bind(endpoint_id)
    .execute(pool)
    .await?;

    Ok(())
}
