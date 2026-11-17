use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, PoisonError};

use uuid::Uuid;

/// Per-tenant generations of a cache, advanced when a tenant's entries must be forgotten.
///
/// A load that read the database before a change committed may finish after the change, and
/// its stale value would be cached again. Reading the tenant's generation before loading and
/// keying the entry by it (or checking it on a hit) makes that value unreachable once the
/// generation advances. Values come from one increasing sequence and are never reused, so an
/// entry cached before an advance can never match again.
#[derive(Debug, Default)]
pub struct CacheGeneration {
    sequence: AtomicU64,
    by_tenant: Mutex<HashMap<Uuid, u64>>,
}

impl CacheGeneration {
    pub fn new() -> Self {
        Self::default()
    }

    /// The tenant's generation, read before loading.
    pub fn of(&self, tenant_id: Uuid) -> u64 {
        let by_tenant = self
            .by_tenant
            .lock()
            .unwrap_or_else(PoisonError::into_inner);

        by_tenant.get(&tenant_id).copied().unwrap_or_default()
    }

    /// For entries whose tenant is only known after loading: taken before the load, then
    /// checked with `is_current`.
    pub fn snapshot(&self) -> u64 {
        self.sequence.load(Ordering::SeqCst)
    }

    /// Whether nothing of the tenant was forgotten after `snapshot` was taken.
    pub fn is_current(&self, tenant_id: Uuid, snapshot: u64) -> bool {
        self.of(tenant_id) <= snapshot
    }

    /// Called after the tenant's change committed.
    pub fn advance(&self, tenant_id: Uuid) {
        let next = self
            .sequence
            .fetch_add(1, Ordering::SeqCst)
            .saturating_add(1);
        let mut by_tenant = self
            .by_tenant
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        by_tenant.insert(tenant_id, next);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn advancing_one_tenant_leaves_the_others_cached() {
        let generation = CacheGeneration::new();
        let changed = Uuid::new_v4();
        let untouched = Uuid::new_v4();
        let before = generation.of(changed);
        let snapshot = generation.snapshot();
        generation.advance(changed);

        assert_ne!(generation.of(changed), before);
        assert_eq!(generation.of(untouched), 0);
        assert!(generation.is_current(untouched, snapshot));
        assert!(generation.is_current(changed, snapshot) == false);
        assert!(generation.is_current(changed, generation.snapshot()));
    }
}
