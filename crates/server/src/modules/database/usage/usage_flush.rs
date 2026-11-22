use std::time::Duration;

use tokio::sync::watch;
use tokio::time::interval;

use crate::app_state::AppState;
use crate::modules::database::usage::usage_repository::{add_usage, prune_usage};

/// How stale the console's Data API metrics may be.
const FLUSH_INTERVAL: Duration = Duration::from_secs(15);

/// Writes the counted Data API responses to the control plane, and once more on shutdown.
pub async fn run_usage_flush(state: AppState, mut stopped: watch::Receiver<bool>) {
    let mut ticks = interval(FLUSH_INTERVAL);

    loop {
        tokio::select! {
            _ = stopped.changed() => {
                flush_usage(&state).await;
                return;
            }
            _ = ticks.tick() => {}
        }

        flush_usage(&state).await;

        if let Err(error) = prune_usage(&state.control_plane_pool).await {
            tracing::warn!(%error, "could not prune old Data API usage");
        }
    }
}

/// A failed write puts the counters back for the next tick instead of losing them.
pub async fn flush_usage(state: &AppState) {
    let counters = state.data_api_usage.take();

    if let Err(error) = add_usage(&state.control_plane_pool, &counters).await {
        tracing::warn!(%error, "could not record Data API usage; retrying on the next flush");
        state.data_api_usage.restore(counters);
    }
}
