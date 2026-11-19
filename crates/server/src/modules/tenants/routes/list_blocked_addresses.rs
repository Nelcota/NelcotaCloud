use axum::Json;

use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::tenants::ip_blocks::blocked_address_repository::{
    BlockedAddress, list_blocked_addresses as find_blocks,
};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/blocked-addresses`: the addresses and ranges refused by the public auth routes,
/// newest first. Expired blocks are left out.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/blocked-addresses",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Blocks in force", body = Vec<BlockedAddress>),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_blocked_addresses(
    admin: TenantAdminContext,
) -> Result<Json<Vec<BlockedAddress>>, ApiError> {
    Ok(Json(find_blocks(&admin.pool).await?))
}
