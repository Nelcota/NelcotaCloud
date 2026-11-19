use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use sqlx::PgPool;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::admin_actor::AdminActor;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;

/// A tenant admin plus a pool on the tenant's database, for admin routes on its users.
pub struct TenantAdminContext {
    pub tenant_id: Uuid,
    pub actor: AdminActor,
    pub origin: RequestOrigin,
    pub pool: PgPool,
}

impl FromRequestParts<AppState> for TenantAdminContext {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let admin = TenantAdmin::from_request_parts(parts, state).await?;
        let tenant_id = admin.tenant_id;
        let pool = state
            .tenant_pools
            .pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;

        Ok(Self {
            tenant_id,
            actor: admin.actor,
            origin: admin.origin,
            pool,
        })
    }
}

impl TenantAdminContext {
    /// Who is acting and where the request came from, for the activity log.
    pub fn author(&self) -> (AdminActor, &RequestOrigin) {
        (self.actor, &self.origin)
    }
}
