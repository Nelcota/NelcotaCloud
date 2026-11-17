use sqlx::PgPool;

use crate::modules::auth::audit::audit_event::NewAuditEvent;

/// Records the event after what it describes already happened. A failure is logged instead of
/// failing the request: the login or admin action succeeded and must not be reported as failed.
pub async fn record_audit_event(pool: &PgPool, event: NewAuditEvent) {
    let action = event.action;
    let inserted = insert_audit_event(pool, event).await;

    if let Err(error) = inserted {
        tracing::error!(%error, ?action, "could not record an audit event");
    }
}

async fn insert_audit_event(pool: &PgPool, event: NewAuditEvent) -> Result<(), sqlx::Error> {
    let ip_address = event.ip_address.map(|address| address.to_string());
    sqlx::query(
        "INSERT INTO audit_events (action, user_id, email, actor, actor_account_id, login_method, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(event.action)
    .bind(event.user_id)
    .bind(event.email)
    .bind(event.actor.kind)
    .bind(event.actor.account_id)
    .bind(event.login_method)
    .bind(ip_address)
    .execute(pool)
    .await?;

    Ok(())
}
