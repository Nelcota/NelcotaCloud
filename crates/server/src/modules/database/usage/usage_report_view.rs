use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use utoipa::ToSchema;

/// The project's Data API traffic over a period: totals, a point per hour or day, and the
/// busiest tables, statuses and methods.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DataApiUsageReport {
    pub requests: i64,
    /// Responses 400 to 499: bad queries, refused credentials, rate limits.
    pub client_errors: i64,
    /// Responses 500 and above.
    pub server_errors: i64,
    /// Time spent answering, summed over every request (divide by `requests` for the mean).
    pub duration_milliseconds: i64,
    /// Oldest first, every hour or day present even when empty.
    pub series: Vec<UsagePoint>,
    /// The ten busiest tables and functions; an empty name gathers names that matched nothing.
    pub resources: Vec<ResourceUsage>,
    pub statuses: Vec<StatusUsage>,
    pub methods: Vec<MethodUsage>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UsagePoint {
    /// The first instant of the hour or UTC day.
    #[serde(with = "time::serde::rfc3339")]
    pub start: OffsetDateTime,
    pub requests: i64,
    pub client_errors: i64,
    pub server_errors: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ResourceUsage {
    /// `todos`, or `rpc/search` for a function.
    pub name: String,
    pub requests: i64,
    pub client_errors: i64,
    pub server_errors: i64,
    pub duration_milliseconds: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct StatusUsage {
    pub status: i32,
    pub requests: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MethodUsage {
    pub method: String,
    pub requests: i64,
}
