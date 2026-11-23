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

/// Bounds the lifetime of prepared keys which are no longer used.
const CACHE_TIME_TO_LIVE: Duration = Duration::from_secs(300);
/// Bounds memory: the least recently used tenants are evicted and reloaded on their next request.
const MAX_CACHED_TENANTS: u64 = 10_000;

/// Prepared signing keys per persisted active key, shared across requests without repeating
/// the AES-GCM decryption and key derivation.
///
/// Concurrent requests for a tenant whose keys are not cached share a single load.
pub struct SigningKeyCache {
    control_plane_pool: PgPool,
    secret_box: Arc<SecretBox>,
    entries: Cache<(Uuid, Uuid), Arc<TenantSigningKeys>>,
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
        let active: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM tenant_signing_keys WHERE tenant_id = $1 AND is_active",
        )
        .bind(tenant_id)
        .fetch_optional(&self.control_plane_pool)
        .await
        .map_err(SigningKeyStoreError::from)?;
        let active = active.ok_or(SigningKeyStoreError::NoActiveKey(tenant_id))?;
        let load = async {
            let keys =
                load_signing_keys(&self.control_plane_pool, tenant_id, &self.secret_box).await?;

            Ok(Arc::new(keys))
        };

        self.entries.try_get_with((tenant_id, active), load).await
    }
}
