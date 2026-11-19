use std::net::IpAddr;

use sqlx::PgPool;

use crate::modules::tenants::ip_blocks::blocked_address_repository::is_address_blocked;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

/// Refuses a public auth request from an address the project blocked. Checked first, before
/// rate limits and password hashing, so a blocked source costs one indexed lookup.
pub async fn ensure_address_allowed(pool: &PgPool, address: IpAddr) -> Result<(), ApiError> {
    if is_address_blocked(pool, address).await? {
        return Err(ApiError::from(TenantsRejection::AddressBlocked));
    }

    Ok(())
}
