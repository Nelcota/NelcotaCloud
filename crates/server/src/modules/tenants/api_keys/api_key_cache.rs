use std::time::Duration;

use moka::future::Cache;
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::api_keys::api_key_repository::{
    ApiKeyLookupError, ApiKeyOwner, find_active_api_key_owner,
};
use crate::shared::cache::cache_generation::CacheGeneration;
use crate::shared::crypto::opaque_token::TokenHash;

/// A revocation reaches other instances within this long; this one forgets the tenant's keys
/// right away.
const CACHE_TIME_TO_LIVE: Duration = Duration::from_secs(60);
/// Bounds memory: the least recently used keys are evicted and looked up again.
const MAX_CACHED_KEYS: u64 = 20_000;

/// Owners of active API keys by key hash, so the requests of an app skip the control plane.
///
/// Only keys that exist are kept: random keys sent by a client never fill the cache.
pub struct ApiKeyCache {
    control_plane_pool: PgPool,
    /// Each owner with the generation snapshot taken before it was loaded.
    owners: Cache<TokenHash, (ApiKeyOwner, u64)>,
    generation: CacheGeneration,
}

impl ApiKeyCache {
    pub fn new(control_plane_pool: PgPool) -> Self {
        let owners = Cache::builder()
            .max_capacity(MAX_CACHED_KEYS)
            .time_to_live(CACHE_TIME_TO_LIVE)
            .build();

        Self {
            control_plane_pool,
            owners,
            generation: CacheGeneration::new(),
        }
    }

    pub async fn owner_of(
        &self,
        key_hash: TokenHash,
    ) -> Result<Option<ApiKeyOwner>, ApiKeyLookupError> {
        if let Some((owner, snapshot)) = self.owners.get(&key_hash).await
            && self.generation.is_current(owner.tenant_id, snapshot)
        {
            return Ok(Some(owner));
        }

        let snapshot = self.generation.snapshot();
        let owner = find_active_api_key_owner(&self.control_plane_pool, &key_hash).await?;

        if let Some(owner) = &owner {
            self.owners.insert(key_hash, (*owner, snapshot)).await;
        }

        Ok(owner)
    }

    /// Forgets the tenant's cached keys after a revocation or its removal committed, including
    /// a lookup still in flight: entries loaded before are no longer current.
    pub fn forget_tenant(&self, tenant_id: Uuid) {
        self.generation.advance(tenant_id);
    }
}
