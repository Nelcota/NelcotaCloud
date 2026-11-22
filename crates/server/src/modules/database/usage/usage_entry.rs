use std::time::Duration;

use uuid::Uuid;

/// What one Data API response adds to the counters: grouped by project, hour, resource,
/// method and status.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct UsageKey {
    pub tenant_id: Uuid,
    /// Seconds since the epoch, rounded down to the hour.
    pub hour_start: i64,
    /// `todos`, `rpc/search`, or empty when the name matched nothing (a 404).
    pub resource: String,
    pub method: String,
    pub status: u16,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct UsageCounter {
    pub requests: i64,
    pub duration_milliseconds: i64,
}

impl UsageCounter {
    /// Adds one response; saturates instead of overflowing on absurd totals.
    pub fn add(&mut self, duration: Duration) {
        let milliseconds = i64::try_from(duration.as_millis()).unwrap_or(i64::MAX);
        self.requests = self.requests.saturating_add(1);
        self.duration_milliseconds = self.duration_milliseconds.saturating_add(milliseconds);
    }

    pub fn merge(&mut self, other: Self) {
        self.requests = self.requests.saturating_add(other.requests);
        self.duration_milliseconds = self
            .duration_milliseconds
            .saturating_add(other.duration_milliseconds);
    }
}

const SECONDS_PER_HOUR: i64 = 3600;

/// The start of the hour that contains `unix_seconds`.
pub fn hour_start(unix_seconds: i64) -> i64 {
    unix_seconds.saturating_sub(unix_seconds.rem_euclid(SECONDS_PER_HOUR))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounds_down_to_the_hour() {
        assert_eq!(hour_start(7_199), 3_600);
        assert_eq!(hour_start(7_200), 7_200);
        assert_eq!(hour_start(0), 0);
    }

    #[test]
    fn counters_add_and_merge() {
        let mut counter = UsageCounter::default();
        counter.add(Duration::from_millis(40));
        counter.add(Duration::from_millis(2));
        let mut total = UsageCounter::default();
        total.merge(counter);
        total.merge(counter);

        assert_eq!(total.requests, 4);
        assert_eq!(total.duration_milliseconds, 84);
    }
}
