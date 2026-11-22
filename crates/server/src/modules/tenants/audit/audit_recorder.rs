use sqlx::types::Json;
use sqlx::{PgExecutor, PgPool};
use uuid::Uuid;

use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;

/// Records the event after what it describes already happened. A failure is logged instead of
/// failing the request: the login or admin action succeeded and must not be reported as failed.
pub async fn record_audit_event(pool: &PgPool, event: NewAuditEvent) {
    let action = event.action;
    let inserted = insert_audit_event(pool, event).await;

    if let Err(error) = inserted {
        tracing::error!(%error, ?action, "could not record an audit event");
    }
}

/// For routes that work on the control plane: the event still goes to the project's own log.
pub async fn record_project_event(
    tenant_pools: &TenantPoolRegistry,
    tenant_id: Uuid,
    event: NewAuditEvent,
) {
    match tenant_pools.pool_for(tenant_id).await {
        Ok(pool) => record_audit_event(&pool, event).await,
        Err(error) => {
            let action = event.action;
            tracing::error!(%error, ?action, "could not open the project log for an audit event");
        }
    }
}

pub async fn insert_audit_event<'e>(
    executor: impl PgExecutor<'e>,
    event: NewAuditEvent,
) -> Result<(), sqlx::Error> {
    let origin = event.origin;
    let ip_address = origin.as_ref().map(|origin| origin.client_ip.to_string());
    let (user_agent, request_id) = match origin {
        Some(origin) => (origin.user_agent, origin.request_id),
        None => (None, None),
    };
    sqlx::query(concat!(
        "INSERT INTO audit_events (action, user_id, email, actor, actor_account_id, login_method,",
        " ip_address, user_agent, request_id, details)",
        " VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    ))
    .bind(event.action)
    .bind(event.user_id)
    .bind(event.email)
    .bind(event.actor.kind)
    .bind(event.actor.account_id)
    .bind(event.login_method)
    .bind(ip_address)
    .bind(user_agent)
    .bind(request_id)
    .bind(event.details.map(Json))
    .execute(executor)
    .await?;

    Ok(())
}
