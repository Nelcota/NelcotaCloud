use std::collections::HashMap;
use std::sync::{Mutex, PoisonError};
use std::time::Duration;

use crate::modules::database::usage::usage_entry::{UsageCounter, UsageKey};

/// Past this many distinct groups between two flushes, new groups are dropped: the counters
/// stay bounded in memory whatever the traffic looks like.
const MAX_PENDING_GROUPS: usize = 50_000;

/// Data API responses counted in memory until the next flush writes them to the control
/// plane. Losing up to one flush interval on a crash is accepted: these are statistics.
#[derive(Default)]
pub struct DataApiUsageBuffer {
    pending: Mutex<HashMap<UsageKey, UsageCounter>>,
}

impl DataApiUsageBuffer {
    pub fn record(&self, key: UsageKey, duration: Duration) {
        let mut pending = self.pending.lock().unwrap_or_else(PoisonError::into_inner);

        if pending.len() >= MAX_PENDING_GROUPS && pending.contains_key(&key) == false {
            tracing::warn!("Data API usage buffer is full; dropping a usage group");
            return;
        }

        pending.entry(key).or_default().add(duration);
    }

    /// Everything counted since the last call.
    pub fn take(&self) -> HashMap<UsageKey, UsageCounter> {
        let mut pending = self.pending.lock().unwrap_or_else(PoisonError::into_inner);

        std::mem::take(&mut *pending)
    }

    /// Puts counters back after a failed write, so the next flush retries them.
    pub fn restore(&self, counters: HashMap<UsageKey, UsageCounter>) {
        let mut pending = self.pending.lock().unwrap_or_else(PoisonError::into_inner);

        for (key, counter) in counters {
            pending.entry(key).or_default().merge(counter);
        }
    }
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::*;

    fn key(status: u16) -> UsageKey {
        UsageKey {
            tenant_id: Uuid::nil(),
            hour_start: 0,
            resource: "todos".to_owned(),
            method: "GET".to_owned(),
            status,
        }
    }

    #[test]
    fn groups_responses_and_empties_on_take() {
        let buffer = DataApiUsageBuffer::default();
        buffer.record(key(200), Duration::from_millis(3));
        buffer.record(key(200), Duration::from_millis(5));
        buffer.record(key(500), Duration::from_millis(9));

        let taken = buffer.take();

        assert_eq!(taken.len(), 2);
        assert_eq!(
            taken.get(&key(200)).map(|counter| counter.requests),
            Some(2)
        );
        assert!(buffer.take().is_empty());
    }

    #[test]
    fn restored_counters_merge_with_new_ones() {
        let buffer = DataApiUsageBuffer::default();
        buffer.record(key(200), Duration::from_millis(1));
        let failed = buffer.take();
        buffer.record(key(200), Duration::from_millis(1));
        buffer.restore(failed);

        assert_eq!(
            buffer.take().get(&key(200)).map(|counter| counter.requests),
            Some(2)
        );
    }
}
