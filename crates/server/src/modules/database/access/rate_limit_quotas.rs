use std::time::Duration;

use crate::shared::rate_limiting::quota_spec::QuotaSpec;

/// Data API requests of apps (publishable key): 300, then 20 per second, per client.
pub const DATA_API_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 300,
    replenish_every: Duration::from_millis(50),
};
/// Data API requests of a project's servers (secret key) and the console: 500, then 100 per
/// second, per project.
pub const DATA_API_PER_PROJECT: QuotaSpec = QuotaSpec {
    burst: 500,
    replenish_every: Duration::from_millis(10),
};
