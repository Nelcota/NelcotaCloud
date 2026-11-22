use serde::Deserialize;
use utoipa::ToSchema;

/// The window a usage report covers, ending now.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, ToSchema)]
pub enum UsagePeriod {
    /// The last 24 hours, one point per hour.
    #[serde(rename = "24h")]
    Day,
    /// The last 7 days (UTC), one point per day.
    #[serde(rename = "7d")]
    Week,
    /// The last 30 days (UTC), one point per day.
    #[serde(rename = "30d")]
    Month,
}

impl UsagePeriod {
    /// The `date_trunc` unit of one point.
    pub fn unit(self) -> &'static str {
        match self {
            Self::Day => "hour",
            Self::Week | Self::Month => "day",
        }
    }

    pub fn points(self) -> i32 {
        match self {
            Self::Day => 24,
            Self::Week => 7,
            Self::Month => 30,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hours_for_a_day_and_days_otherwise() {
        assert_eq!(
            (UsagePeriod::Day.unit(), UsagePeriod::Day.points()),
            ("hour", 24)
        );
        assert_eq!(
            (UsagePeriod::Week.unit(), UsagePeriod::Week.points()),
            ("day", 7)
        );
        assert_eq!(
            (UsagePeriod::Month.unit(), UsagePeriod::Month.points()),
            ("day", 30)
        );
    }
}
