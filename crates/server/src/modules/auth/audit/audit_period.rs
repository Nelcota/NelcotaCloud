use thiserror::Error;
use time::{Duration, OffsetDateTime};

/// The log keeps 90 days; a range of local days may start and end partway through a UTC day,
/// so it may reach one day further on each side.
const MAX_RANGE_DAYS: i64 = 92;

/// Which stretch of the log to read: the whole of it, the last days, or a range of instants.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuditPeriod {
    Whole,
    LastDays(i32),
    /// From `from` (inclusive) up to `to` (exclusive).
    Between {
        from: OffsetDateTime,
        to: OffsetDateTime,
    },
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum AuditPeriodError {
    #[error("Pass both from and to, or neither.")]
    Incomplete,
    #[error("Pass days or a from and to range, not both.")]
    Conflicting,
    #[error("from must be before to.")]
    Reversed,
    #[error("A range spans at most 92 days.")]
    TooLong,
}

/// The period fields a request may carry, before they are checked together.
#[derive(Debug, Clone, Copy)]
pub struct PeriodParams {
    pub days: Option<i32>,
    pub from: Option<OffsetDateTime>,
    pub to: Option<OffsetDateTime>,
}

impl AuditPeriod {
    /// Days and range bounds are each validated on their own; this checks how they combine.
    pub fn parse(params: PeriodParams) -> Result<Self, AuditPeriodError> {
        match (params.days, params.from, params.to) {
            (None, None, None) => Ok(Self::Whole),
            (Some(days), None, None) => Ok(Self::LastDays(days)),
            (Some(_), _, _) => Err(AuditPeriodError::Conflicting),
            (None, Some(from), Some(to)) => Self::between(from, to),
            (None, _, _) => Err(AuditPeriodError::Incomplete),
        }
    }

    fn between(from: OffsetDateTime, to: OffsetDateTime) -> Result<Self, AuditPeriodError> {
        if from >= to {
            return Err(AuditPeriodError::Reversed);
        }

        let longest = Duration::days(MAX_RANGE_DAYS);

        if from.checked_add(longest).is_some_and(|latest| to > latest) {
            return Err(AuditPeriodError::TooLong);
        }

        Ok(Self::Between { from, to })
    }

    pub fn days(&self) -> Option<i32> {
        match self {
            Self::LastDays(days) => Some(*days),
            _ => None,
        }
    }

    pub fn from(&self) -> Option<OffsetDateTime> {
        match self {
            Self::Between { from, .. } => Some(*from),
            _ => None,
        }
    }

    pub fn to(&self) -> Option<OffsetDateTime> {
        match self {
            Self::Between { to, .. } => Some(*to),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use time::{Duration, OffsetDateTime};

    use super::{AuditPeriod, AuditPeriodError, PeriodParams};

    /// Any fixed instant; only the distances between bounds matter.
    const START: OffsetDateTime = OffsetDateTime::UNIX_EPOCH;

    fn parse(
        days: Option<i32>,
        from: Option<OffsetDateTime>,
        to: Option<OffsetDateTime>,
    ) -> Result<AuditPeriod, AuditPeriodError> {
        AuditPeriod::parse(PeriodParams { days, from, to })
    }

    #[test]
    fn reads_the_whole_log_without_a_period() {
        assert_eq!(parse(None, None, None), Ok(AuditPeriod::Whole));
    }

    #[test]
    fn reads_the_last_days() {
        let period = parse(Some(7), None, None);

        assert_eq!(period, Ok(AuditPeriod::LastDays(7)));
        assert_eq!(period.map(|period| period.days()), Ok(Some(7)));
    }

    #[test]
    fn reads_a_range() {
        let end = START + Duration::days(7);
        let period = parse(None, Some(START), Some(end));

        assert_eq!(period.as_ref().map(AuditPeriod::from), Ok(Some(START)));
        assert_eq!(period.as_ref().map(AuditPeriod::to), Ok(Some(end)));
        assert_eq!(period.as_ref().map(AuditPeriod::days), Ok(None));
    }

    #[test]
    fn refuses_half_a_range() {
        assert_eq!(
            parse(None, Some(START), None),
            Err(AuditPeriodError::Incomplete)
        );
        assert_eq!(
            parse(None, None, Some(START)),
            Err(AuditPeriodError::Incomplete)
        );
    }

    #[test]
    fn refuses_days_with_a_range() {
        let end = START + Duration::days(1);

        assert_eq!(
            parse(Some(7), Some(START), Some(end)),
            Err(AuditPeriodError::Conflicting)
        );
        assert_eq!(
            parse(Some(7), Some(START), None),
            Err(AuditPeriodError::Conflicting)
        );
    }

    #[test]
    fn refuses_empty_or_reversed_ranges() {
        let before = START - Duration::days(1);

        assert_eq!(
            parse(None, Some(START), Some(START)),
            Err(AuditPeriodError::Reversed)
        );
        assert_eq!(
            parse(None, Some(START), Some(before)),
            Err(AuditPeriodError::Reversed)
        );
    }

    #[test]
    fn accepts_up_to_ninety_two_days() {
        let longest = START + Duration::days(92);
        let too_long = longest + Duration::seconds(1);

        assert!(parse(None, Some(START), Some(longest)).is_ok());
        assert_eq!(
            parse(None, Some(START), Some(too_long)),
            Err(AuditPeriodError::TooLong)
        );
    }
}
