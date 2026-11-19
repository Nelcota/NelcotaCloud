use std::time::Duration;

use crate::shared::rate_limiting::quota_spec::QuotaSpec;

/// Each console project is a new database: a client gets a few, then one every 5 minutes.
pub const PROJECT_CREATION_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 3,
    replenish_every: Duration::from_secs(300),
};
/// And an account 5 a day, however many networks it uses.
pub const PROJECT_CREATION_PER_ACCOUNT: QuotaSpec = QuotaSpec {
    burst: 5,
    replenish_every: Duration::from_secs(17_280),
};
