use std::sync::Arc;
use std::time::Duration;

use tokio::sync::{OwnedSemaphorePermit, Semaphore};

use crate::modules::database::rejection::database_rejection::DatabaseRejection;

/// Data API and console sessions one instance runs at once, across every project. Each holds a
/// connection, and connections of every project share the Postgres server's `max_connections`
/// with Auth and the control plane, so project traffic is bounded here, not per project.
const MAX_CONCURRENT_SESSIONS: usize = 40;
/// A request waits this long for a slot before it is refused as busy.
const SLOT_WAIT: Duration = Duration::from_secs(5);

/// Slots for running Data API sessions; a session keeps its slot until it ends.
pub struct SessionSlots {
    slots: Arc<Semaphore>,
}

impl SessionSlots {
    pub fn new() -> Self {
        Self {
            slots: Arc::new(Semaphore::new(MAX_CONCURRENT_SESSIONS)),
        }
    }

    pub async fn acquire(&self) -> Result<OwnedSemaphorePermit, DatabaseRejection> {
        let waiting = Arc::clone(&self.slots).acquire_owned();
        let Ok(acquired) = tokio::time::timeout(SLOT_WAIT, waiting).await else {
            return Err(DatabaseRejection::DatabaseBusy);
        };

        acquired.map_err(|_| DatabaseRejection::DatabaseBusy)
    }
}

impl Default for SessionSlots {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test(start_paused = true)]
    async fn refuses_once_every_slot_is_taken() -> Result<(), DatabaseRejection> {
        let slots = SessionSlots::new();
        let mut held = Vec::new();

        for _ in 0..MAX_CONCURRENT_SESSIONS {
            held.push(slots.acquire().await?);
        }

        assert!(matches!(
            slots.acquire().await,
            Err(DatabaseRejection::DatabaseBusy)
        ));
        held.pop();
        assert!(slots.acquire().await.is_ok());
        Ok(())
    }
}
