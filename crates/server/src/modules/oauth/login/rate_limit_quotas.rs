use std::time::Duration;

use crate::shared::rate_limiting::quota_spec::QuotaSpec;

/// Starting an OAuth login writes a pending authorization to the control plane.
pub const OAUTH_START_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 20,
    replenish_every: Duration::from_secs(6),
};
