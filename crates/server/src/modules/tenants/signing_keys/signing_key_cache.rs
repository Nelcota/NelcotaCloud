use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use sqlx::PgPool;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::modules::tenants::signing_keys::signing_key_repository::{
    SigningKeyStoreError, TenantSigningKeys, load_signing_keys,
};
use crate::shared::crypto::secret_box::SecretBox;

/// Keys are reloaded after this long, so a future key rotation reaches every instance soon.
const CACHE_TIME_TO_LIVE: Duration = Duration::from_secs(300);

struct CachedKeys {
    loaded_at: Instant,
    keys: Arc<TenantSigningKeys>,
}

/// Decrypted signing keys per tenant, so authenticated requests skip the control plane query
/// and the AES-GCM decryption.
pub struct SigningKeyCache {
    control_plane_pool: PgPool,
    secret_box: Arc<SecretBox>,
    entries: RwLock<HashMap<Uuid, CachedKeys>>,
}

impl SigningKeyCache {
    pub fn new(control_plane_pool: PgPool, secret_box: Arc<SecretBox>) -> Self {
        Self {
            control_plane_pool,
            secret_box,
            entries: RwLock::new(HashMap::new()),
        }
    }

    /// The tenant's active key (signs) and every key that still verifies.
    pub async fn keys_for(
        &self,
        tenant_id: Uuid,
    ) -> Result<Arc<TenantSigningKeys>, SigningKeyStoreError> {
        if let Some(cached) = self.entries.read().await.get(&tenant_id)
            && cached.loaded_at.elapsed() < CACHE_TIME_TO_LIVE
        {
            return Ok(Arc::clone(&cached.keys));
        }

        let keys = load_signing_keys(&self.control_plane_pool, tenant_id, &self.secret_box).await?;
        let keys = Arc::new(keys);
        let cached = CachedKeys {
            loaded_at: Instant::now(),
            keys: Arc::clone(&keys),
        };
        self.entries.write().await.insert(tenant_id, cached);

        Ok(keys)
    }
}
