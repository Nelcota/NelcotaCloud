use std::sync::Arc;
use std::time::Duration;

use moka::future::Cache;
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::signing_keys::signing_key_repository::{
    SigningKeyStoreError, load_signing_keys,
};
use crate::modules::tenants::signing_keys::tenant_signing_keys::TenantSigningKeys;
use crate::shared::crypto::secret_box::SecretBox;

/// Keys are reloaded after this long, so a future key rotation reaches every instance soon.
const CACHE_TIME_TO_LIVE: Duration = Duration::from_secs(300);
/// Bounds memory: the least recently used tenants are evicted and reloaded on their next request.
const MAX_CACHED_TENANTS: u64 = 10_000;

/// Prepared signing keys per tenant, so authenticated requests skip the control plane query,
/// the AES-GCM decryption and the key derivation.
///
/// Concurrent requests for a tenant whose keys are not cached share a single load.
pub struct SigningKeyCache {
    control_plane_pool: PgPool,
    secret_box: Arc<SecretBox>,
    entries: Cache<Uuid, Arc<TenantSigningKeys>>,
}

impl SigningKeyCache {
    pub fn new(control_plane_pool: PgPool, secret_box: Arc<SecretBox>) -> Self {
        let entries = Cache::builder()
            .max_capacity(MAX_CACHED_TENANTS)
            .time_to_live(CACHE_TIME_TO_LIVE)
            .build();

        Self {
            control_plane_pool,
            secret_box,
            entries,
        }
    }

    /// The tenant's active key (signs) and every key that still verifies.
    pub async fn keys_for(
        &self,
        tenant_id: Uuid,
    ) -> Result<Arc<TenantSigningKeys>, Arc<SigningKeyStoreError>> {
        let load = async {
            let keys =
                load_signing_keys(&self.control_plane_pool, tenant_id, &self.secret_box).await?;

            Ok(Arc::new(keys))
        };

        self.entries.try_get_with(tenant_id, load).await
    }

    /// Drops the cached keys, so this instance uses a rotated key right away. Other instances
    /// pick it up within the cache lifetime; tokens of the old key keep verifying meanwhile.
    pub async fn forget(&self, tenant_id: Uuid) {
        self.entries.invalidate(&tenant_id).await;
    }
}
