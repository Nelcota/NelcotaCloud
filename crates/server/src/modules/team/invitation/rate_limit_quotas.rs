use std::time::Duration;

use crate::shared::rate_limiting::quota_spec::QuotaSpec;

/// Invitations one console account sends: 10, then one every 6 minutes.
pub const INVITATIONS_PER_ACCOUNT: QuotaSpec = QuotaSpec {
    burst: 10,
    replenish_every: Duration::from_secs(360),
};
