use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

/// A tenant with at least one enabled endpoint that receives `audit.event`.
#[derive(Debug, sqlx::FromRow)]
pub struct AuditSubscriber {
    pub tenant_id: Uuid,
    pub observed_at: OffsetDateTime,
    pub earliest_start: OffsetDateTime,
    endpoint_ids: Vec<Uuid>,
    started_at: Vec<OffsetDateTime>,
}

impl AuditSubscriber {
    pub fn endpoints_at(&self, occurred_at: OffsetDateTime) -> Vec<Uuid> {
        self.endpoint_ids
            .iter()
            .copied()
            .zip(self.started_at.iter().copied())
            .filter_map(|(id, started_at)| (occurred_at >= started_at).then_some(id))
            .collect()
    }
}

/// Read on every relay round, so a new or disabled endpoint takes effect within one round.
pub async fn audit_subscribers(pool: &PgPool) -> Result<Vec<AuditSubscriber>, sqlx::Error> {
    sqlx::query_as(
        "SELECT tenant_id, statement_timestamp() AS observed_at, \
         min(audit_subscribed_at) AS earliest_start, array_agg(id ORDER BY id) AS endpoint_ids, \
         array_agg(audit_subscribed_at ORDER BY id) AS started_at FROM webhook_endpoints \
         WHERE audit_subscribed_at IS NOT NULL GROUP BY tenant_id",
    )
    .fetch_all(pool)
    .await
}
