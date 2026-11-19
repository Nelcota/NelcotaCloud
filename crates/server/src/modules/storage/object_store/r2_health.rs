use std::sync::atomic::Ordering;
use std::time::Duration;

use tokio::sync::watch;
use tokio::time::{MissedTickBehavior, interval};

use crate::modules::storage::object_store::r2_store::R2Store;
use crate::modules::storage::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

impl R2Store {
    pub fn require_healthy(&self) -> Result<(), ApiError> {
        if self.healthy.load(Ordering::Acquire) == false {
            return Err(StorageError::Unavailable.into());
        }

        Ok(())
    }

    pub async fn refresh_health(&self) {
        let result = self
            .client
            .list_objects_v2()
            .bucket(&self.bucket)
            .max_keys(1)
            .send()
            .await;
        self.healthy.store(result.is_ok(), Ordering::Release);

        if let Err(error) = result {
            let status = error
                .raw_response()
                .map(|response| response.status().as_u16());
            tracing::warn!(?status, "private object storage probe failed");
        }
    }

    pub async fn monitor_health(self, mut stop: watch::Receiver<bool>) {
        let mut ticks = interval(Duration::from_secs(30));
        ticks.set_missed_tick_behavior(MissedTickBehavior::Skip);
        ticks.tick().await;

        loop {
            tokio::select! {
                _ = stop.changed() => return,
                _ = ticks.tick() => self.refresh_health().await,
            }
        }
    }
}
