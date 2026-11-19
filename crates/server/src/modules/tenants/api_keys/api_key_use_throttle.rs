use std::time::Duration;

use moka::future::Cache;
use uuid::Uuid;

/// Bounds memory: the least recently used keys are forgotten and may be recorded again early.
const MAX_TRACKED_KEYS: u64 = 20_000;

/// Lets each key through once per interval, so a busy app costs one write every few minutes
/// instead of one per request.
pub struct ApiKeyUseThrottle {
    recently_let_through: Cache<Uuid, ()>,
}

impl ApiKeyUseThrottle {
    pub fn new(interval: Duration) -> Self {
        let recently_let_through = Cache::builder()
            .max_capacity(MAX_TRACKED_KEYS)
            .time_to_live(interval)
            .build();

        Self {
            recently_let_through,
        }
    }

    /// `true` for the first use of a key in the interval; concurrent callers get one `true`.
    pub async fn should_record(&self, key_id: Uuid) -> bool {
        let entry = self.recently_let_through.entry(key_id).or_insert(()).await;

        entry.is_fresh()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_INTERVAL: Duration = Duration::from_secs(300);

    #[tokio::test]
    async fn lets_the_first_use_of_a_key_through() {
        let throttle = ApiKeyUseThrottle::new(TEST_INTERVAL);

        assert!(throttle.should_record(Uuid::new_v4()).await);
    }

    #[tokio::test]
    async fn holds_back_later_uses_within_the_interval() {
        let throttle = ApiKeyUseThrottle::new(TEST_INTERVAL);
        let key_id = Uuid::new_v4();

        assert!(throttle.should_record(key_id).await);
        assert!(throttle.should_record(key_id).await == false);
        assert!(throttle.should_record(key_id).await == false);
    }

    #[tokio::test]
    async fn tracks_each_key_on_its_own() {
        let throttle = ApiKeyUseThrottle::new(TEST_INTERVAL);
        let first_key = Uuid::new_v4();
        let second_key = Uuid::new_v4();

        assert!(throttle.should_record(first_key).await);
        assert!(throttle.should_record(second_key).await);
    }

    #[tokio::test]
    async fn lets_a_key_through_again_after_the_interval() {
        let throttle = ApiKeyUseThrottle::new(Duration::from_millis(50));
        let key_id = Uuid::new_v4();

        assert!(throttle.should_record(key_id).await);
        tokio::time::sleep(Duration::from_millis(120)).await;
        throttle.recently_let_through.run_pending_tasks().await;

        assert!(throttle.should_record(key_id).await);
    }
}
