use serde_json::Value;
use sqlx::PgConnection;
use sqlx::types::Json;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;

/// The database clock, so event timestamps agree with every other time the database keeps.
pub async fn database_now(connection: &mut PgConnection) -> Result<OffsetDateTime, sqlx::Error> {
    sqlx::query_scalar("SELECT now()")
        .fetch_one(connection)
        .await
}

pub struct OutboxEvent {
    pub id: Uuid,
    pub payload: Value,
}

pub struct OutboxBatch<'a> {
    pub events: &'a [OutboxEvent],
    pub event_type: WebhookEventType,
    pub endpoint_ids: &'a [Uuid],
}

/// Writes events and their pending deliveries inside the caller's transaction.
pub async fn insert_outbox_batch(
    connection: &mut PgConnection,
    batch: OutboxBatch<'_>,
) -> Result<(), sqlx::Error> {
    if batch.events.is_empty() {
        return Ok(());
    }

    let (event_ids, payloads): (Vec<_>, Vec<_>) = batch
        .events
        .iter()
        .map(|event| (event.id, Json(&event.payload)))
        .unzip();
    sqlx::query(
        "INSERT INTO webhook_events (id, event_type, payload) \
         SELECT id, $2, payload FROM unnest($1::uuid[], $3::jsonb[]) AS event(id, payload)",
    )
    .bind(&event_ids)
    .bind(batch.event_type.as_str())
    .bind(&payloads)
    .execute(&mut *connection)
    .await?;
    sqlx::query(
        "INSERT INTO webhook_deliveries (id, event_id, endpoint_id) \
         SELECT gen_random_uuid(), event_id, endpoint_id \
         FROM unnest($1::uuid[]) AS event_id CROSS JOIN unnest($2::uuid[]) AS endpoint_id",
    )
    .bind(&event_ids)
    .bind(batch.endpoint_ids)
    .execute(connection)
    .await?;

    Ok(())
}
