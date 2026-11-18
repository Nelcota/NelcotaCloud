use std::time::Duration;

/// Waits after each failed attempt: about 28 hours in total, enough to ride out a
/// receiver's deploy or an overnight outage. After the last one the delivery gives up.
const RETRY_DELAYS: [Duration; 7] = [
    Duration::from_secs(5),
    Duration::from_secs(5 * 60),
    Duration::from_secs(30 * 60),
    Duration::from_secs(2 * 60 * 60),
    Duration::from_secs(5 * 60 * 60),
    Duration::from_secs(10 * 60 * 60),
    Duration::from_secs(10 * 60 * 60),
];

/// Spreads retries by up to ±20%, so receivers coming back from an outage are not hit by every
/// queued event in the same second.
const JITTER_PERCENT: u64 = 20;
const PERCENT: u64 = 100;

/// The wait before the next attempt, after `failed_attempts` failures (counting the one that
/// just happened); `None` when the delivery should give up.
pub fn retry_delay(failed_attempts: u32) -> Option<Duration> {
    let index = usize::try_from(failed_attempts.checked_sub(1)?).ok()?;
    let delay = RETRY_DELAYS.get(index)?;

    Some(with_jitter(*delay))
}

fn with_jitter(delay: Duration) -> Duration {
    let millis = u64::try_from(delay.as_millis()).unwrap_or(u64::MAX);
    let spread = millis.saturating_mul(JITTER_PERCENT) / PERCENT;
    let lowest = millis.saturating_sub(spread);
    let highest = millis.saturating_add(spread);

    Duration::from_millis(rand::random_range(lowest..=highest))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_retry_comes_after_about_five_seconds() -> Result<(), &'static str> {
        let delay = retry_delay(1).ok_or("expected a retry")?;

        assert!(delay >= Duration::from_secs(4), "{delay:?}");
        assert!(delay <= Duration::from_secs(6), "{delay:?}");
        Ok(())
    }

    #[test]
    fn gives_up_after_the_last_delay() {
        assert!(retry_delay(7).is_some());
        assert!(retry_delay(8).is_none());
    }

    #[test]
    fn zero_failures_has_no_delay() {
        assert!(retry_delay(0).is_none());
    }
}
