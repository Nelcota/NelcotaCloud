use std::time::Duration;

use sqlx::PgPool;
use tracing::{Instrument, Span};
use uuid::Uuid;

use crate::modules::tenants::api_keys::api_key_repository::record_api_key_use;
use crate::modules::tenants::api_keys::api_key_use_throttle::ApiKeyUseThrottle;

/// How fresh "last used" is: a key is stamped at most once per this many seconds, by any
/// instance (the database also refuses a newer stamp within it).
const RECORD_INTERVAL_SECONDS: i32 = 300;

/// Records when each API key was last used, so owners know whether revoking it breaks an app.
///
/// Best effort: the stamp is written in the background, so a slow or unreachable control plane
/// never delays or fails the request that used the key.
pub struct ApiKeyUsage {
    control_plane_pool: PgPool,
    throttle: ApiKeyUseThrottle,
}

impl ApiKeyUsage {
    pub fn new(control_plane_pool: PgPool) -> Self {
        let interval = Duration::from_secs(RECORD_INTERVAL_SECONDS.unsigned_abs().into());

        Self {
            control_plane_pool,
            throttle: ApiKeyUseThrottle::new(interval),
        }
    }

    /// Notes that a request used the key; at most one write per key and interval follows.
    pub async fn note_use(&self, key_id: Uuid) {
        if self.throttle.should_record(key_id).await == false {
            return;
        }

        let pool = self.control_plane_pool.clone();
        tokio::spawn(record_use(pool, key_id).instrument(Span::current()));
    }
}

/// Runs detached from the request; a failure only leaves "last used" a few minutes stale, so it
/// is logged and not retried.
async fn record_use(pool: PgPool, key_id: Uuid) {
    if let Err(error) = record_api_key_use(&pool, key_id, RECORD_INTERVAL_SECONDS).await {
        tracing::warn!(%key_id, %error, "could not record API key use");
    }
}
