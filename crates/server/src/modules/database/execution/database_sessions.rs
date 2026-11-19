use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::database::execution::session_slots::{SessionSlot, SessionSlots};
use crate::modules::database::schema::schema_cache::SchemaCache;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::shared::http::api_error::ApiError;

/// Database sessions share a connection registry and a process-wide concurrency limit.
pub struct DatabaseSessions<'a> {
    pub tenant_pools: &'a TenantPoolRegistry,
    pub slots: &'a SessionSlots,
    pub schema_cache: &'a SchemaCache,
}

pub(crate) struct DatabaseSessionPools {
    pub slot: SessionSlot,
    pub data_pool: PgPool,
    pub admin_pool: PgPool,
}

impl DatabaseSessions<'_> {
    pub(crate) async fn acquire(&self, tenant_id: Uuid) -> Result<DatabaseSessionPools, ApiError> {
        let slot = self.slots.acquire(tenant_id).await?;
        let tenant_pools = self.tenant_pools;
        let data_pool = tenant_pools
            .data_api_pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let admin_pool = tenant_pools
            .pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;

        Ok(DatabaseSessionPools {
            slot,
            data_pool,
            admin_pool,
        })
    }
}
