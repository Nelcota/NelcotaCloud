use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use sqlx::PgPool;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::api_key_tenant::ApiKeyTenant;
use crate::shared::http::api_error::ApiError;

/// The tenant behind the API key plus a pool on its own database, for routes that read or
/// write the tenant's users. The tenant comes only from the API key, never from client ids.
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub pool: PgPool,
}

impl FromRequestParts<AppState> for TenantContext {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let tenant = ApiKeyTenant::from_request_parts(parts, state).await?;
        let pool = state
            .tenant_pools
            .pool_for(tenant.tenant_id)
            .await
            .map_err(ApiError::internal)?;

        Ok(Self {
            tenant_id: tenant.tenant_id,
            pool,
        })
    }
}
