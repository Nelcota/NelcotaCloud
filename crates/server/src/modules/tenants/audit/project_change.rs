use serde_json::Value;
use uuid::Uuid;

use crate::modules::tenants::access::admin_actor::AdminActor;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_project_event;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::shared::http::request_origin::RequestOrigin;

/// A change an admin made to the project itself (keys, settings, team, schema).
pub struct ProjectChange<'a> {
    pub tenant_id: Uuid,
    /// Who made it and where the request came from.
    pub author: (AdminActor, &'a RequestOrigin),
    pub action: AuditAction,
    /// A few facts chosen by the route; never a request body or a secret.
    pub details: Value,
}

/// Recorded in the project's own log, after the change was saved.
pub async fn record_project_change(tenant_pools: &TenantPoolRegistry, change: ProjectChange<'_>) {
    let event =
        NewAuditEvent::on_project(change.action, change.author).with_details(change.details);

    record_project_event(tenant_pools, change.tenant_id, event).await;
}
