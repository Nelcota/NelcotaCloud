use std::time::Duration;

use moka::future::Cache;
use sqlx::PgPool;

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
    owners: Cache<(TokenHash, u64), ApiKeyOwner>,
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
        let cache_key = (key_hash, self.generation.current());

        if let Some(owner) = self.owners.get(&cache_key).await {
            return Ok(Some(owner));
        }

        let owner = find_active_api_key_owner(&self.control_plane_pool, &cache_key.0).await?;

        if let Some(owner) = &owner {
            self.owners.insert(cache_key, *owner).await;
        }

        Ok(owner)
    }

    /// Forgets the cached keys after a revocation or a tenant's removal committed, including a
    /// lookup still in flight. Every tenant's keys are looked up again: revocations are rare.
    pub fn forget_all(&self) {
        self.generation.advance();
    }
}
