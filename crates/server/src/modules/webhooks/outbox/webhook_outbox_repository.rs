use serde_json::Value;
use sqlx::PgConnection;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;

/// The database clock, so event timestamps agree with every other time the database keeps.
pub async fn database_now(connection: &mut PgConnection) -> Result<OffsetDateTime, sqlx::Error> {
    sqlx::query_scalar("SELECT now()")
        .fetch_one(connection)
        .await
}

pub struct OutboxEntry<'a> {
    pub event_id: Uuid,
    pub event_type: WebhookEventType,
    pub payload: &'a Value,
    pub endpoint_ids: &'a [Uuid],
}

/// Writes the event and one pending delivery per endpoint, inside the caller's transaction.
pub async fn insert_outbox_entry(
    connection: &mut PgConnection,
    entry: OutboxEntry<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO webhook_events (id, event_type, payload) VALUES ($1, $2, $3)")
        .bind(entry.event_id)
        .bind(entry.event_type.as_str())
        .bind(entry.payload)
        .execute(&mut *connection)
        .await?;
    sqlx::query(
        "INSERT INTO webhook_deliveries (id, event_id, endpoint_id) \
         SELECT gen_random_uuid(), $1, endpoint_id FROM UNNEST($2::uuid[]) AS endpoint_id",
    )
    .bind(entry.event_id)
    .bind(entry.endpoint_ids)
    .execute(connection)
    .await?;

    Ok(())
}
