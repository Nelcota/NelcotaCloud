use axum::extract::Path;
use axum::http::StatusCode;
use serde_json::json;
use uuid::Uuid;

use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::modules::tenants::ip_blocks::blocked_address_repository::delete_blocked_address;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/blocked-addresses/{block_id}`: the address may log in again at once.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/blocked-addresses/{block_id}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("block_id" = Uuid, Path, description = "Id of the block")),
    responses(
        (status = 204, description = "Block removed"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No block with this id", body = ErrorBody),
    )
)]
pub async fn unblock_address(
    admin: TenantAdminContext,
    Path(block_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let network = delete_blocked_address(&admin.pool, block_id)
        .await?
        .ok_or(ApiError::NotFound("blocked address"))?;
    let details = json!({ "network": network });
    let event = NewAuditEvent::on_project(AuditAction::AddressUnblocked, admin.author())
        .with_details(details);
    record_audit_event(&admin.pool, event).await;

    Ok(StatusCode::NO_CONTENT)
}
