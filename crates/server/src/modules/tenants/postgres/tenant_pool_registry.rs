use std::sync::Arc;
use std::time::Duration;

use moka::future::Cache;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

use crate::modules::tenants::postgres::tenant_database_server::{
    TenantDatabaseError, TenantDatabaseServer,
};
use crate::modules::tenants::postgres::tenant_migration::{
    TenantMigrationError, migrate_tenant_database,
};
use crate::modules::tenants::postgres::tenant_pool_limits::TenantPoolLimits;
use crate::modules::tenants::provisioning::tenant_repository::find_tenant_slug;
use crate::modules::tenants::provisioning::tenant_slug::{InvalidTenantSlug, TenantSlug};

/// Idle tenants give their connections back quickly: the sum of every tenant's pool must stay
/// under the Postgres server's `max_connections`.
const TENANT_POOL_IDLE_TIMEOUT: Duration = Duration::from_secs(30);
/// Data API connections are given back sooner: project traffic comes in bursts.
const DATA_API_POOL_IDLE_TIMEOUT: Duration = Duration::from_secs(5);
/// A tenant database that does not answer fails its own requests quickly.
const TENANT_POOL_ACQUIRE_TIMEOUT: Duration = Duration::from_secs(5);
/// Pools of tenants without requests for this long are dropped, closing their connections.
const POOL_TIME_TO_IDLE: Duration = Duration::from_secs(30 * 60);

#[derive(Debug, thiserror::Error)]
pub enum TenantPoolError {
    #[error("tenant {0} does not exist")]
    TenantNotFound(Uuid),
    #[error("database error while opening tenant pool: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Migration(#[from] TenantMigrationError),
    #[error(transparent)]
    TenantDatabase(#[from] TenantDatabaseError),
    #[error("stored tenant slug is invalid: {0}")]
    InvalidSlug(#[from] InvalidTenantSlug),
}

/// Lazily opens and caches the connection pools of each tenant database.
///
/// One for the platform's own code (Auth, webhooks) and one for the Data API, so project traffic can never
/// take the connections Auth needs.
///
/// Concurrent first requests of one tenant open its pool (and run its migrations) once, while
/// other tenants are never blocked by it. A failed opening is not cached: the next request
/// retries.
pub struct TenantPoolRegistry {
    control_plane_pool: PgPool,
    tenant_database_base_url: String,
    pools: Cache<Uuid, PgPool>,
    data_api_pools: Cache<Uuid, PgPool>,
    mode: TenantPoolMode,
    limits: TenantPoolLimits,
}

enum TenantPoolMode {
    Legacy,
    ManagedApi { runtime_password: String },
    ManagedWorker,
}

impl TenantPoolRegistry {
    pub fn new(control_plane_pool: PgPool, tenant_database_base_url: String) -> Self {
        Self {
            control_plane_pool,
            tenant_database_base_url,
            pools: pool_cache(TenantPoolLimits::API),
            data_api_pools: pool_cache(TenantPoolLimits::API),
            mode: TenantPoolMode::Legacy,
            limits: TenantPoolLimits::API,
        }
    }

    /// Replaces the default API limits; call before the first pool opens.
    pub fn with_limits(mut self, limits: TenantPoolLimits) -> Self {
        self.pools = pool_cache(limits);
        self.data_api_pools = pool_cache(limits);
        self.limits = limits;
        self
    }

    pub fn with_runtime_password(mut self, runtime_password: String) -> Self {
        self.mode = TenantPoolMode::ManagedApi { runtime_password };
        self
    }

    pub fn with_managed_schema(mut self) -> Self {
        self.mode = TenantPoolMode::ManagedWorker;
        self
    }

    pub async fn pool_for(&self, tenant_id: Uuid) -> Result<PgPool, Arc<TenantPoolError>> {
        let entry = self
            .pools
            .entry(tenant_id)
            .or_try_insert_with(self.open_pool(tenant_id))
            .await?;
        if entry.is_fresh() {
            // The cache evicts lazily; evicting now keeps a new pool from pushing the process
            // past its limit. An evicted pool closes once the last run using it lets go.
            self.pools.run_pending_tasks().await;
        }

        Ok(entry.into_value())
    }

    pub async fn audit_maintenance_pool(
        &self,
        tenant_id: Uuid,
    ) -> Result<Option<PgPool>, Arc<TenantPoolError>> {
        if matches!(self.mode, TenantPoolMode::Legacy) {
            // The maintenance scan must not start a migration in a cold development database.
            return Ok(self.pools.get(&tenant_id).await);
        }

        self.pool_for(tenant_id).await.map(Some)
    }

    /// Connections as the authenticator role, on a database already migrated.
    pub async fn data_api_pool_for(&self, tenant_id: Uuid) -> Result<PgPool, Arc<TenantPoolError>> {
        self.pool_for(tenant_id).await?;

        self.data_api_pools
            .try_get_with(tenant_id, self.open_data_api_pool(tenant_id))
            .await
    }

    async fn open_pool(&self, tenant_id: Uuid) -> Result<PgPool, TenantPoolError> {
        let slug = self.tenant_slug(tenant_id).await?;
        let server = self.database_server();
        let options = match &self.mode {
            TenantPoolMode::ManagedApi { runtime_password } => {
                server.runtime_auth_options(&slug, runtime_password)?
            }
            _ => server.auth_options(&slug)?,
        };
        let pool = tenant_pool_options(self.limits).connect_lazy_with(options);
        if matches!(self.mode, TenantPoolMode::Legacy) {
            migrate_tenant_database(&pool).await?;
        }

        Ok(pool)
    }

    async fn open_data_api_pool(&self, tenant_id: Uuid) -> Result<PgPool, TenantPoolError> {
        let slug = self.tenant_slug(tenant_id).await?;
        let database_server = self.database_server();
        if matches!(self.mode, TenantPoolMode::Legacy) {
            database_server.ensure_tenant_role(&slug).await?;
        }
        let options = database_server.data_api_options(&slug)?;

        Ok(tenant_pool_options(self.limits)
            .idle_timeout(DATA_API_POOL_IDLE_TIMEOUT)
            .connect_lazy_with(options))
    }

    async fn tenant_slug(&self, tenant_id: Uuid) -> Result<TenantSlug, TenantPoolError> {
        let raw_slug = find_tenant_slug(&self.control_plane_pool, tenant_id).await?;
        let raw_slug = raw_slug.ok_or(TenantPoolError::TenantNotFound(tenant_id))?;

        Ok(TenantSlug::parse(&raw_slug)?)
    }

    /// The server that holds every tenant database.
    pub fn database_server(&self) -> TenantDatabaseServer<'_> {
        let server = TenantDatabaseServer::new(&self.tenant_database_base_url);
        if matches!(self.mode, TenantPoolMode::ManagedApi { .. }) {
            return server.with_runtime_role();
        }

        server
    }

    /// Closes and forgets the tenant's pool, before its database is dropped.
    pub async fn forget(&self, tenant_id: Uuid) {
        if let Some(pool) = self.data_api_pools.remove(&tenant_id).await {
            pool.close().await;
        }

        if let Some(pool) = self.pools.remove(&tenant_id).await {
            pool.close().await;
        }
    }
}

fn pool_cache(limits: TenantPoolLimits) -> Cache<Uuid, PgPool> {
    Cache::builder()
        .max_capacity(limits.open_pools)
        .time_to_idle(POOL_TIME_TO_IDLE)
        .build()
}

fn tenant_pool_options(limits: TenantPoolLimits) -> PgPoolOptions {
    PgPoolOptions::new()
        .max_connections(limits.connections_per_tenant)
        .idle_timeout(TENANT_POOL_IDLE_TIMEOUT)
        .acquire_timeout(TENANT_POOL_ACQUIRE_TIMEOUT)
        .acquire_slow_threshold(Duration::from_millis(100))
}
