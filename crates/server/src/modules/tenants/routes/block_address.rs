use axum::Json;
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::json;
use time::{Duration, OffsetDateTime};
use utoipa::ToSchema;
use validator::Validate;

use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::modules::tenants::ip_blocks::blocked_address_repository::{
    BlockedAddress, MAX_BLOCKED_ADDRESSES, NewBlock, count_blocked_addresses,
    insert_blocked_address,
};
use crate::modules::tenants::ip_blocks::blocked_network::BlockedNetwork;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;
use crate::shared::text::single_line::check_single_line;

/// A year: longer blocks are better made permanent.
const MAX_BLOCK_HOURS: i64 = 24 * 365;

#[derive(Deserialize, Validate, ToSchema)]
pub struct BlockAddressBody {
    /// An address (`203.0.113.7`) or a range (`203.0.113.0/24`, at most /16, or /48 for IPv6).
    #[validate(length(min = 1, max = 64))]
    pub address: String,
    /// Why it was blocked, for the team.
    #[validate(length(min = 1, max = 200), custom(function = check_single_line))]
    pub note: Option<String>,
    /// Lifts the block after this many hours; without it, the block lasts until removed.
    #[validate(range(min = 1, max = MAX_BLOCK_HOURS))]
    pub expires_in_hours: Option<i64>,
}

/// `POST /admin/blocked-addresses`: refuses logins, signups and emailed links from the address.
/// Blocking a listed range again replaces its note and expiry.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/blocked-addresses",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = BlockAddressBody,
    responses(
        (status = 201, description = "Address blocked", body = BlockedAddress),
        (status = 400, description = "Not an address, or a range wider than /16 (/48 for IPv6)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 409, description = "The project already blocks 500 addresses", body = ErrorBody),
    )
)]
pub async fn block_address(
    admin: TenantAdminContext,
    ValidatedJson(body): ValidatedJson<BlockAddressBody>,
) -> Result<(StatusCode, Json<BlockedAddress>), ApiError> {
    let network = BlockedNetwork::parse(&body.address).map_err(ApiError::invalid_request)?;

    if count_blocked_addresses(&admin.pool).await? >= MAX_BLOCKED_ADDRESSES {
        return Err(ApiError::Conflict(format!(
            "a project blocks at most {MAX_BLOCKED_ADDRESSES} addresses: remove one first"
        )));
    }

    let block = NewBlock {
        network,
        note: body.note.as_deref(),
        expires_at: expiry(body.expires_in_hours),
    };
    let blocked = insert_blocked_address(&admin.pool, block).await?;
    let details = json!({ "network": blocked.network, "note": blocked.note });
    let event = NewAuditEvent::on_project(AuditAction::AddressBlocked, admin.author())
        .with_details(details);
    record_audit_event(&admin.pool, event).await;

    Ok((StatusCode::CREATED, Json(blocked)))
}

fn expiry(hours: Option<i64>) -> Option<OffsetDateTime> {
    let hours = hours?;

    OffsetDateTime::now_utc().checked_add(Duration::hours(hours))
}
