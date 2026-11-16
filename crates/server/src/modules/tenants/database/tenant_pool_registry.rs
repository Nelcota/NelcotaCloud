use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tokio::sync::{OnceCell, RwLock};
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
/// A tenant database that does not answer fails its own requests quickly.
const TENANT_POOL_ACQUIRE_TIMEOUT: Duration = Duration::from_secs(5);

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
///
/// Each tenant has its own cell: concurrent first requests of one tenant open its pool (and run
/// its migrations) once, while other tenants are never blocked by it. A failed opening leaves
/// the cell empty, so the next request retries.
pub struct TenantPoolRegistry {
    control_plane_pool: PgPool,
    tenant_database_base_url: String,
    pools: RwLock<HashMap<Uuid, Arc<OnceCell<PgPool>>>>,
}

impl TenantPoolRegistry {
    pub fn new(control_plane_pool: PgPool, tenant_database_base_url: String) -> Self {
        Self {
            control_plane_pool,
            tenant_database_base_url,
            pools: RwLock::new(HashMap::new()),
        }
    }

    pub async fn pool_for(&self, tenant_id: Uuid) -> Result<PgPool, TenantPoolError> {
        let cell = self.cell_for(tenant_id).await;
        let pool = cell.get_or_try_init(|| self.open_pool(tenant_id)).await?;

        Ok(pool.clone())
    }

    async fn cell_for(&self, tenant_id: Uuid) -> Arc<OnceCell<PgPool>> {
        if let Some(cell) = self.pools.read().await.get(&tenant_id) {
            return Arc::clone(cell);
        }

        let mut pools = self.pools.write().await;

        Arc::clone(pools.entry(tenant_id).or_default())
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
            .acquire_timeout(TENANT_POOL_ACQUIRE_TIMEOUT)
            .connect_lazy(&database_server.database_url(&slug))?;
        // Brings databases of tenants created before the latest migrations up to date.
        TENANT_MIGRATOR.run(&pool).await?;

        Ok(pool)
    }
}
