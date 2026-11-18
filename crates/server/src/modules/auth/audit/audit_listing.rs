use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::audit::audit_event::AuditEvent;

/// How long events are kept; older ones are deleted when the log is read.
pub const RETENTION_DAYS: i32 = 90;

/// One page of events, newest first.
#[derive(Debug, Serialize, ToSchema)]
pub struct AuditPage {
    pub events: Vec<AuditEvent>,
    /// Pass as `before` to read older events; `null` on the last page.
    pub next_before: Option<i64>,
}

pub struct AuditQuery {
    /// Only events about this user; every event without it.
    pub user_id: Option<Uuid>,
    /// Only events older than this id.
    pub before: Option<i64>,
    pub page_size: usize,
}

pub async fn list_audit_events(
    pool: &PgPool,
    query: &AuditQuery,
) -> Result<AuditPage, sqlx::Error> {
    delete_expired_events(pool).await?;
    // One more than asked, to know whether an older page exists.
    let fetch_limit = i64::try_from(query.page_size.saturating_add(1)).unwrap_or(i64::MAX);
    let mut events: Vec<AuditEvent> = sqlx::query_as(
        "SELECT audit_events.id, action, user_id, COALESCE(users.email, audit_events.email) AS email, actor, actor_account_id, login_method, ip_address, occurred_at FROM audit_events LEFT JOIN users ON users.id = audit_events.user_id WHERE ($1::uuid IS NULL OR user_id = $1) AND ($2::bigint IS NULL OR audit_events.id < $2) ORDER BY audit_events.id DESC LIMIT $3",
    )
    .bind(query.user_id)
    .bind(query.before)
    .bind(fetch_limit)
    .fetch_all(pool)
    .await?;
    let next_before = next_cursor(&events, query.page_size);
    events.truncate(query.page_size);

    Ok(AuditPage {
        events,
        next_before,
    })
}

/// The id of the page's last event when an older one was fetched beyond the page.
fn next_cursor(events: &[AuditEvent], page_size: usize) -> Option<i64> {
    if events.len() <= page_size {
        return None;
    }

    let last_on_page = page_size.checked_sub(1)?;

    events.get(last_on_page).map(|event| event.id)
}

async fn delete_expired_events(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM audit_events WHERE occurred_at < now() - make_interval(days => $1)")
        .bind(RETENTION_DAYS)
        .execute(pool)
        .await?;

    Ok(())
}
