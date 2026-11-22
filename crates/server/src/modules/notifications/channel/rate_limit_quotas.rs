use std::time::Duration;

use crate::shared::rate_limiting::quota_spec::QuotaSpec;

/// Test alerts per project: 5, then one every 12 seconds. Each one sends a real email or chat
/// message, so they must not become a way to spam an address or a channel.
pub const NOTIFICATION_TESTS_PER_PROJECT: QuotaSpec = QuotaSpec {
    burst: 5,
    replenish_every: Duration::from_secs(12),
};
