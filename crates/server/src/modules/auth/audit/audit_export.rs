use axum::body::Body;
use sqlx::PgPool;

use crate::modules::auth::audit::audit_csv::{HEADER, write_event};
use crate::modules::auth::audit::audit_query::{
    AuditQuery, AuditSelection, audit_selection, bind_audit_statement,
};
use crate::modules::auth::csv_stream::{csv_body, send_csv};

/// One event as the spreadsheet shows it: every value already text, as stored.
#[derive(Debug, sqlx::FromRow)]
pub struct AuditExportRow {
    /// RFC 3339 in UTC.
    pub occurred_at: String,
    pub action: String,
    pub email: Option<String>,
    pub user_id: Option<String>,
    pub actor: String,
    pub actor_account_id: Option<String>,
    pub login_method: Option<String>,
    pub ip_address: Option<String>,
    /// Why a login was refused: `wrong_password`, `unknown_email` or `invalid_email`.
    pub failure_reason: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: Option<String>,
    /// The JSON object as text.
    pub details: Option<String>,
}

const AUDIT_EXPORT_QUERY: AuditSelection = audit_selection!(
    r#"to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS occurred_at,"#,
    " action, COALESCE(users.email, audit_events.email) AS email, user_id::text AS user_id,",
    " actor, actor_account_id::text AS actor_account_id, login_method, ip_address,",
    " CASE WHEN action <> 'login_failed' THEN NULL",
    " WHEN user_id IS NOT NULL THEN 'wrong_password'",
    " WHEN audit_events.email IS NOT NULL THEN 'unknown_email'",
    " ELSE 'invalid_email' END AS failure_reason,",
    " user_agent, request_id, details::text AS details",
);

/// Streams every event the filters match, newest first.
pub fn export_audit_events(pool: PgPool, query: &AuditQuery<'_>) -> Body {
    let statement = bind_audit_statement(&AUDIT_EXPORT_QUERY, query, None);

    csv_body(move |sender| async move {
        send_csv(sender, statement.fetch(&pool), &HEADER, write_event).await
    })
}
