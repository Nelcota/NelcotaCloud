use std::collections::HashMap;
use std::time::Duration;

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

use crate::modules::tenants::database::tenant_database_server::TenantDatabaseServer;
use crate::modules::tenants::provisioning::tenant_repository::find_tenant_slug;
use crate::modules::tenants::provisioning::tenant_slug::{InvalidTenantSlug, TenantSlug};
use crate::shared::database::migrators::TENANT_MIGRATOR;

/// Small per-tenant pools: with one database per tenant, connections multiply by tenant count.
const MAX_CONNECTIONS_PER_TENANT: u32 = 5;
/// Idle tenants give their connections back quickly: the sum of every tenant's pool must stay
/// under the Postgres server's `max_connections`.
const TENANT_POOL_IDLE_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Debug, thiserror::Error)]
pub enum TenantPoolError {
    #[error("tenant {0} does not exist")]
    TenantNotFound(Uuid),
    #[error("database error while opening tenant pool: {0}")]
    Database(#[from] sqlx::Error),
    #[error("failed to migrate tenant database: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error("stored tenant slug is invalid: {0}")]
    InvalidSlug(#[from] InvalidTenantSlug),
}

/// Lazily opens and caches one connection pool per tenant database.
pub struct TenantPoolRegistry {
    control_plane_pool: PgPool,
    tenant_database_base_url: String,
    pools: RwLock<HashMap<Uuid, PgPool>>,
    /// One pool opening at a time, so concurrent first requests of a tenant do not each open a
    /// pool and run the migrator.
    opening: Mutex<()>,
}

impl TenantPoolRegistry {
    pub fn new(control_plane_pool: PgPool, tenant_database_base_url: String) -> Self {
        Self {
            control_plane_pool,
            tenant_database_base_url,
            pools: RwLock::new(HashMap::new()),
            opening: Mutex::new(()),
        }
    }

    pub async fn pool_for(&self, tenant_id: Uuid) -> Result<PgPool, TenantPoolError> {
        if let Some(pool) = self.cached_pool(tenant_id).await {
            return Ok(pool);
        }

        let _opening = self.opening.lock().await;

        // Another request may have opened it while this one waited for the lock.
        if let Some(pool) = self.cached_pool(tenant_id).await {
            return Ok(pool);
        }

        let pool = self.open_pool(tenant_id).await?;
        self.pools.write().await.insert(tenant_id, pool.clone());

        Ok(pool)
    }

    async fn cached_pool(&self, tenant_id: Uuid) -> Option<PgPool> {
        self.pools.read().await.get(&tenant_id).cloned()
    }

    async fn open_pool(&self, tenant_id: Uuid) -> Result<PgPool, TenantPoolError> {
        let raw_slug = find_tenant_slug(&self.control_plane_pool, tenant_id).await?;
        let Some(raw_slug) = raw_slug else {
            return Err(TenantPoolError::TenantNotFound(tenant_id));
        };
        let slug = TenantSlug::parse(&raw_slug)?;
        let database_server = TenantDatabaseServer::new(&self.tenant_database_base_url);
        let pool = PgPoolOptions::new()
            .max_connections(MAX_CONNECTIONS_PER_TENANT)
            .idle_timeout(TENANT_POOL_IDLE_TIMEOUT)
            .connect_lazy(&database_server.database_url(&slug))?;
        // Brings databases of tenants created before the latest migrations up to date.
        TENANT_MIGRATOR.run(&pool).await?;

        Ok(pool)
    }
}
