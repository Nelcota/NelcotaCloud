use std::sync::atomic::{AtomicU64, Ordering};

/// Part of a cache's keys, advanced when entries must be forgotten.
///
/// A load that read the database before a change committed may finish after the change
/// invalidated the cache, and its stale value would be inserted again. It is inserted under
/// the generation read before loading; once the generation advances, lookups use the next one
/// and never see it. Advancing forgets every entry of the cache: meant for rare changes
/// (rotations, revocations, settings), not for every request.
#[derive(Debug, Default)]
pub struct CacheGeneration(AtomicU64);

impl CacheGeneration {
    pub fn new() -> Self {
        Self(AtomicU64::new(0))
    }

    /// Read before loading, and used in the key the load is cached under.
    pub fn current(&self) -> u64 {
        self.0.load(Ordering::SeqCst)
    }

    /// Called after the change committed.
    pub fn advance(&self) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn advancing_moves_lookups_to_a_new_generation() {
        let generation = CacheGeneration::new();
        let before = generation.current();
        generation.advance();

        assert_ne!(generation.current(), before);
    }
}
