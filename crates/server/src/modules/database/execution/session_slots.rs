use std::sync::Arc;
use std::time::{Duration, Instant};

use moka::future::Cache;
use tokio::sync::{OwnedSemaphorePermit, Semaphore};
use uuid::Uuid;

use crate::modules::database::rejection::database_rejection::DatabaseRejection;

/// Data API and console sessions one instance runs at once, across every project. Each holds a
/// connection, and connections of every project share the Postgres server's `max_connections`
/// with Auth and the control plane.
const MAX_CONCURRENT_SESSIONS: usize = 40;
/// Sessions of one project at once: its pool's size, so one project waiting for its own
/// connections never holds the slots other projects need.
const MAX_SESSIONS_PER_PROJECT: usize = 5;
/// A request waits this long for its slots before it is refused as busy.
const SLOT_WAIT: Duration = Duration::from_secs(5);
/// Projects whose slot counters are kept; idle ones are dropped.
const MAX_TRACKED_PROJECTS: u64 = 10_000;
const PROJECT_SLOTS_TIME_TO_IDLE: Duration = Duration::from_secs(10 * 60);

/// A running session's slots: one of its project's, one of the instance's.
pub struct SessionSlot {
    _project: OwnedSemaphorePermit,
    _instance: OwnedSemaphorePermit,
}

/// Slots for running Data API sessions; a session keeps its slot until it ends.
pub struct SessionSlots {
    instance: Arc<Semaphore>,
    projects: Cache<Uuid, Arc<Semaphore>>,
}

impl SessionSlots {
    pub fn new() -> Self {
        let projects = Cache::builder()
            .max_capacity(MAX_TRACKED_PROJECTS)
            .time_to_idle(PROJECT_SLOTS_TIME_TO_IDLE)
            .build();

        Self {
            instance: Arc::new(Semaphore::new(MAX_CONCURRENT_SESSIONS)),
            projects,
        }
    }

    /// The project's slot first: a busy project waits on its own slots, not the instance's.
    pub async fn acquire(&self, tenant_id: Uuid) -> Result<SessionSlot, DatabaseRejection> {
        let started = Instant::now();
        let project_slots = self
            .projects
            .get_with(tenant_id, async {
                Arc::new(Semaphore::new(MAX_SESSIONS_PER_PROJECT))
            })
            .await;
        let both = async {
            let project = project_slots.acquire_owned().await;
            let instance = Arc::clone(&self.instance).acquire_owned().await;

            (project, instance)
        };
        let slots = tokio::time::timeout(SLOT_WAIT, both).await;
        tracing::debug!(
            wait_ms = started.elapsed().as_secs_f64() * 1_000.0,
            "waited for database session slots"
        );
        let (project, instance) = match slots {
            Ok((Ok(project), Ok(instance))) => (project, instance),
            _ => return Err(DatabaseRejection::DatabaseBusy),
        };

        Ok(SessionSlot {
            _project: project,
            _instance: instance,
        })
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
    async fn one_busy_project_leaves_slots_for_the_others() -> Result<(), DatabaseRejection> {
        let slots = SessionSlots::new();
        let busy = Uuid::new_v4();
        let mut held = Vec::new();

        for _ in 0..MAX_SESSIONS_PER_PROJECT {
            held.push(slots.acquire(busy).await?);
        }

        assert!(matches!(
            slots.acquire(busy).await,
            Err(DatabaseRejection::DatabaseBusy)
        ));
        assert!(slots.acquire(Uuid::new_v4()).await.is_ok());
        held.pop();
        assert!(slots.acquire(busy).await.is_ok());
        Ok(())
    }

    #[tokio::test(start_paused = true)]
    async fn refuses_once_every_instance_slot_is_taken() -> Result<(), DatabaseRejection> {
        let slots = SessionSlots::new();
        let mut held = Vec::new();

        for _ in 0..MAX_CONCURRENT_SESSIONS {
            held.push(slots.acquire(Uuid::new_v4()).await?);
        }

        assert!(matches!(
            slots.acquire(Uuid::new_v4()).await,
            Err(DatabaseRejection::DatabaseBusy)
        ));
        Ok(())
    }
}
