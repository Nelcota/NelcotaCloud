use serde::Serialize;
use serde_json::Value;
use sqlx::PgConnection;
use sqlx::types::Json;
use time::OffsetDateTime;
use uuid::Uuid;

/// One activity log entry as receivers get it in `data.event`; the same fields as the API.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct RelayedAuditEvent {
    pub id: i64,
    pub action: String,
    pub user_id: Option<Uuid>,
    pub email: Option<String>,
    pub actor: String,
    pub actor_account_id: Option<Uuid>,
    pub login_method: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: Option<String>,
    pub details: Option<Json<Value>>,
    #[serde(with = "time::serde::rfc3339")]
    pub occurred_at: OffsetDateTime,
}

pub struct EventWindow {
    pub limit: i64,
    /// Older events are skipped: a receiver that subscribes late, or a relay that was down,
    /// never gets a flood of the past.
    pub max_age_minutes: i32,
}

/// Claims only committed events, each independently of the sequence's allocation order.
pub async fn claim_events(
    connection: &mut PgConnection,
    window: EventWindow,
) -> Result<Vec<RelayedAuditEvent>, sqlx::Error> {
    sqlx::query_as(concat!(
        "SELECT audit_events.id, action, user_id,",
        " COALESCE(users.email, audit_events.email) AS email, actor, actor_account_id,",
        " login_method, ip_address, user_agent, request_id, details, audit_events.occurred_at",
        " FROM audit_webhook_pending pending JOIN audit_events ON audit_events.id = pending.event_id",
        " LEFT JOIN users ON users.id = audit_events.user_id",
        " WHERE pending.occurred_at > now() - make_interval(mins => $2)",
        " ORDER BY pending.occurred_at, pending.event_id LIMIT $1",
        " FOR UPDATE OF pending SKIP LOCKED",
    ))
    .bind(window.limit)
    .bind(window.max_age_minutes)
    .fetch_all(connection)
    .await
}

pub async fn finish_events(
    connection: &mut PgConnection,
    event_ids: &[i64],
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM audit_webhook_pending WHERE event_id = ANY($1)")
        .bind(event_ids)
        .execute(connection)
        .await?;

    Ok(())
}
