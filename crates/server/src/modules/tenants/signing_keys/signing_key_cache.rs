use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use sqlx::PgPool;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::modules::tenants::signing_keys::signing_key_repository::{
    SigningKeyStoreError, load_signing_keys,
};
use crate::modules::tenants::signing_keys::tenant_signing_keys::TenantSigningKeys;
use crate::shared::crypto::secret_box::SecretBox;

/// Keys are reloaded after this long, so a future key rotation reaches every instance soon.
const CACHE_TIME_TO_LIVE: Duration = Duration::from_secs(300);

struct CachedKeys {
    loaded_at: Instant,
    keys: Arc<TenantSigningKeys>,
}

/// Prepared signing keys per tenant, so authenticated requests skip the control plane query,
/// the AES-GCM decryption and the key derivation.
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

        // Taken before the query: the entry's age then never understates how old its keys are.
        let requested_at = Instant::now();
        let keys = load_signing_keys(&self.control_plane_pool, tenant_id, &self.secret_box).await?;
        let keys = Arc::new(keys);
        let cached = CachedKeys {
            loaded_at: requested_at,
            keys: Arc::clone(&keys),
        };
        store_unless_newer_exists(&mut *self.entries.write().await, tenant_id, cached);

        Ok(keys)
    }
}

/// A slow load that started before a concurrent one must not replace its fresher keys.
fn store_unless_newer_exists(
    entries: &mut HashMap<Uuid, CachedKeys>,
    tenant_id: Uuid,
    cached: CachedKeys,
) {
    if entries
        .get(&tenant_id)
        .is_some_and(|existing| existing.loaded_at >= cached.loaded_at)
    {
        return;
    }

    entries.insert(tenant_id, cached);
}

#[cfg(test)]
mod tests {
    use std::error::Error;

    use super::*;
    use crate::modules::tenants::signing_keys::prepared_signing_key::PreparedSigningKey;
    use crate::modules::tenants::signing_keys::signing_key::SigningKey;

    fn cached_at(loaded_at: Instant) -> Result<CachedKeys, Box<dyn Error>> {
        let active = PreparedSigningKey::prepare(&SigningKey::generate()?)?;
        let keys = TenantSigningKeys::new(active, Vec::new())?;

        Ok(CachedKeys {
            loaded_at,
            keys: Arc::new(keys),
        })
    }

    #[test]
    fn older_load_does_not_replace_newer_entry() -> Result<(), Box<dyn Error>> {
        let older = Instant::now();
        let newer = older + Duration::from_secs(1);
        let tenant_id = Uuid::new_v4();
        let mut entries = HashMap::new();
        store_unless_newer_exists(&mut entries, tenant_id, cached_at(newer)?);

        store_unless_newer_exists(&mut entries, tenant_id, cached_at(older)?);

        assert_eq!(
            entries.get(&tenant_id).map(|entry| entry.loaded_at),
            Some(newer)
        );
        Ok(())
    }

    #[test]
    fn newer_load_replaces_older_entry() -> Result<(), Box<dyn Error>> {
        let older = Instant::now();
        let newer = older + Duration::from_secs(1);
        let tenant_id = Uuid::new_v4();
        let mut entries = HashMap::new();
        store_unless_newer_exists(&mut entries, tenant_id, cached_at(older)?);

        store_unless_newer_exists(&mut entries, tenant_id, cached_at(newer)?);

        assert_eq!(
            entries.get(&tenant_id).map(|entry| entry.loaded_at),
            Some(newer)
        );
        Ok(())
    }
}
