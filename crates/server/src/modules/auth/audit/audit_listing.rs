use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;

use crate::modules::auth::audit::audit_event::AuditEvent;
use crate::modules::auth::audit::audit_query::{
    AuditQuery, AuditSelection, audit_selection, audit_statement,
};

/// One page of events, newest first.
#[derive(Debug, Serialize, ToSchema)]
pub struct AuditPage {
    pub events: Vec<AuditEvent>,
    /// Pass as `before` to read older events; `null` on the last page.
    pub next_before: Option<i64>,
}

const AUDIT_EVENTS_QUERY: AuditSelection = audit_selection!(
    "audit_events.id, action, user_id, COALESCE(users.email, audit_events.email) AS email,",
    " actor, actor_account_id, login_method, ip_address, user_agent, request_id, details,",
    " occurred_at",
);

pub async fn list_audit_events(
    pool: &PgPool,
    query: &AuditQuery<'_>,
    page_size: usize,
) -> Result<AuditPage, sqlx::Error> {
    // One more than asked, to know whether an older page exists.
    let fetch_limit = i64::try_from(page_size.saturating_add(1)).unwrap_or(i64::MAX);
    let mut events: Vec<AuditEvent> = audit_statement(&AUDIT_EVENTS_QUERY, query, fetch_limit)
        .fetch_all(pool)
        .await?;
    let next_before = next_cursor(&events, page_size);
    events.truncate(page_size);

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
