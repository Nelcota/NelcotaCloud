use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;

/// A tenant with at least one enabled endpoint that receives `audit.event`.
#[derive(Debug, sqlx::FromRow)]
pub struct AuditSubscriber {
    pub tenant_id: Uuid,
    pub endpoint_ids: Vec<Uuid>,
}

/// Read on every relay round, so a new or disabled endpoint takes effect within one round.
pub async fn audit_subscribers(pool: &PgPool) -> Result<Vec<AuditSubscriber>, sqlx::Error> {
    sqlx::query_as(
        "SELECT tenant_id, array_agg(id ORDER BY id) AS endpoint_ids FROM webhook_endpoints \
         WHERE is_enabled AND $1 = ANY(event_types) GROUP BY tenant_id",
    )
    .bind(WebhookEventType::AuditEvent.as_str())
    .fetch_all(pool)
    .await
}
