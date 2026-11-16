use time::{Duration, OffsetDateTime};

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("expiry time is outside the supported date range")]
pub struct ExpiryOutOfRange;

/// `start + lifetime`, checked: `OffsetDateTime + Duration` panics when the result leaves the
/// supported date range, and this code must never panic.
pub fn expiry_after(
    start: OffsetDateTime,
    lifetime: Duration,
) -> Result<OffsetDateTime, ExpiryOutOfRange> {
    start.checked_add(lifetime).ok_or(ExpiryOutOfRange)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_the_lifetime() -> Result<(), ExpiryOutOfRange> {
        let start = OffsetDateTime::UNIX_EPOCH;
        let expiry = expiry_after(start, Duration::minutes(15))?;

        assert_eq!(expiry.unix_timestamp(), 900);
        Ok(())
    }

    #[test]
    fn rejects_overflowing_lifetimes_instead_of_panicking() {
        let now = OffsetDateTime::now_utc();

        assert_eq!(expiry_after(now, Duration::MAX), Err(ExpiryOutOfRange));
        assert_eq!(expiry_after(now, Duration::MIN), Err(ExpiryOutOfRange));
    }
}
