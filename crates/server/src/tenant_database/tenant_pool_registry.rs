use std::collections::HashMap;
use std::sync::Arc;

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::control_plane::tenant_repository::find_database_url_ciphertext;
use crate::crypto::secret_box::{SecretBox, SecretBoxError};
use crate::tenant_database::migrators::TENANT_MIGRATOR;

/// Small per-tenant pools: with one database per tenant, connections multiply by tenant count.
const MAX_CONNECTIONS_PER_TENANT: u32 = 5;

#[derive(Debug, thiserror::Error)]
pub enum TenantPoolError {
    #[error("tenant {0} does not exist")]
    TenantNotFound(Uuid),
    #[error("database error while opening tenant pool: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Decryption(#[from] SecretBoxError),
    #[error("failed to migrate tenant database: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error("stored tenant database URL is not valid UTF-8")]
    InvalidDatabaseUrl,
}

/// Lazily opens and caches one connection pool per tenant database.
pub struct TenantPoolRegistry {
    control_plane_pool: PgPool,
    secret_box: Arc<SecretBox>,
    pools: RwLock<HashMap<Uuid, PgPool>>,
}

impl TenantPoolRegistry {
    pub fn new(control_plane_pool: PgPool, secret_box: Arc<SecretBox>) -> Self {
        Self {
            control_plane_pool,
            secret_box,
            pools: RwLock::new(HashMap::new()),
        }
    }

    pub async fn pool_for(&self, tenant_id: Uuid) -> Result<PgPool, TenantPoolError> {
        if let Some(pool) = self.pools.read().await.get(&tenant_id) {
            return Ok(pool.clone());
        }

        let opened_pool = self.open_pool(tenant_id).await?;
        let mut pools = self.pools.write().await;
        // Another request may have opened the pool meanwhile; keep the first one.
        let pool = pools.entry(tenant_id).or_insert(opened_pool);

        Ok(pool.clone())
    }

    async fn open_pool(&self, tenant_id: Uuid) -> Result<PgPool, TenantPoolError> {
        let ciphertext = find_database_url_ciphertext(&self.control_plane_pool, tenant_id).await?;
        let Some(ciphertext) = ciphertext else {
            return Err(TenantPoolError::TenantNotFound(tenant_id));
        };
        let url_bytes = self.secret_box.open(&ciphertext)?;
        let database_url =
            String::from_utf8(url_bytes).map_err(|_| TenantPoolError::InvalidDatabaseUrl)?;
        let pool = PgPoolOptions::new()
            .max_connections(MAX_CONNECTIONS_PER_TENANT)
            .connect_lazy(&database_url)?;
        // Brings databases of tenants created before the latest migrations up to date.
        TENANT_MIGRATOR.run(&pool).await?;

        Ok(pool)
    }
}
