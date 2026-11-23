use std::time::Duration;

use crate::shared::rate_limiting::quota_spec::QuotaSpec;

/// Each upload is decoded and resized on the server: 10 changes, then one a minute, per project.
pub const LOGO_CHANGES_PER_PROJECT: QuotaSpec = QuotaSpec {
    burst: 10,
    replenish_every: Duration::from_secs(60),
};
