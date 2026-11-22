use std::sync::Arc;
use std::time::{Duration, Instant};

use moka::future::Cache;
use tokio::sync::{OwnedSemaphorePermit, Semaphore};
use uuid::Uuid;

use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::tenants::postgres::tenant_pool_limits::TenantPoolLimits;

const MAX_QUEUED_PER_PROJECT: usize = 32;
const MAX_BURST_QUEUED_PER_PROJECT: usize = 32;
const MAX_QUEUED_PER_INSTANCE: usize = 160;
const SLOT_WAIT: Duration = Duration::from_millis(3750);
const BURST_WAIT: Duration = Duration::from_millis(500);
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
    waiting: Semaphore,
    projects: Cache<Uuid, Arc<ProjectSlots>>,
}

struct ProjectSlots {
    running: Arc<Semaphore>,
    waiting: Semaphore,
    burst: Semaphore,
}

impl SessionSlots {
    pub fn new() -> Self {
        let projects = Cache::builder()
            .max_capacity(MAX_TRACKED_PROJECTS)
            .time_to_idle(PROJECT_SLOTS_TIME_TO_IDLE)
            .build();

        Self {
            instance: Arc::new(Semaphore::new(TenantPoolLimits::DATA_API_SESSION_BUDGET)),
            waiting: Semaphore::new(MAX_QUEUED_PER_INSTANCE),
            projects,
        }
    }

    /// The project's slot first: a busy project waits on its own slots, not the instance's.
    pub async fn acquire(&self, tenant_id: Uuid) -> Result<SessionSlot, DatabaseRejection> {
        let project_slots = self
            .projects
            .get_with(tenant_id, async {
                let connections = TenantPoolLimits::DATA_API.connections_per_tenant;
                Arc::new(ProjectSlots {
                    running: Arc::new(Semaphore::new(usize::try_from(connections).unwrap_or(1))),
                    waiting: Semaphore::new(MAX_QUEUED_PER_PROJECT),
                    burst: Semaphore::new(MAX_BURST_QUEUED_PER_PROJECT),
                })
            })
            .await;

        if let Ok(project) = Arc::clone(&project_slots.running).try_acquire_owned()
            && let Ok(instance) = Arc::clone(&self.instance).try_acquire_owned()
        {
            return Ok(SessionSlot {
                _project: project,
                _instance: instance,
            });
        }

        // Short operations can drain a burst quickly. Overflow waiters leave early when the
        // running sessions are slow, while sharing the same FIFO running slots.
        let (_project_wait, deadline) = match project_slots.waiting.try_acquire() {
            Ok(wait) => (wait, SLOT_WAIT),
            Err(_) => (
                project_slots
                    .burst
                    .try_acquire()
                    .map_err(|_| DatabaseRejection::DatabaseBusy)?,
                BURST_WAIT,
            ),
        };
        let _instance_wait = self
            .waiting
            .try_acquire()
            .map_err(|_| DatabaseRejection::DatabaseBusy)?;
        let started = Instant::now();
        let both = async {
            let project = Arc::clone(&project_slots.running)
                .acquire_owned()
                .await
                .map_err(|_| DatabaseRejection::DatabaseBusy)?;
            let instance = Arc::clone(&self.instance)
                .acquire_owned()
                .await
                .map_err(|_| DatabaseRejection::DatabaseBusy)?;

            Ok(SessionSlot {
                _project: project,
                _instance: instance,
            })
        };
        let slots = tokio::time::timeout(deadline, both).await;
        tracing::debug!(
            wait_ms = started.elapsed().as_secs_f64() * 1_000.0,
            "waited for database session slots"
        );
        slots.map_err(|_| DatabaseRejection::DatabaseBusy)?
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

        for _ in 0..TenantPoolLimits::DATA_API.connections_per_tenant {
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

        for _ in 0..TenantPoolLimits::DATA_API_SESSION_BUDGET {
            held.push(slots.acquire(Uuid::new_v4()).await?);
        }

        assert!(matches!(
            slots.acquire(Uuid::new_v4()).await,
            Err(DatabaseRejection::DatabaseBusy)
        ));
        Ok(())
    }

    #[tokio::test(start_paused = true)]
    async fn full_project_queue_refuses_immediately_and_releases_cancelled_waiters()
    -> Result<(), DatabaseRejection> {
        let slots = SessionSlots::new();
        let busy = Uuid::new_v4();
        let mut running = Vec::new();

        for _ in 0..TenantPoolLimits::DATA_API.connections_per_tenant {
            running.push(slots.acquire(busy).await?);
        }

        let mut waiting = Vec::new();
        for _ in 0..MAX_QUEUED_PER_PROJECT.saturating_add(MAX_BURST_QUEUED_PER_PROJECT) {
            let mut request = Box::pin(slots.acquire(busy));
            assert!(futures_util::poll!(request.as_mut()).is_pending());
            waiting.push(request);
        }

        let mut refused = Box::pin(slots.acquire(busy));
        assert!(matches!(
            futures_util::poll!(refused.as_mut()),
            std::task::Poll::Ready(Err(DatabaseRejection::DatabaseBusy))
        ));
        assert!(slots.acquire(Uuid::new_v4()).await.is_ok());
        drop(waiting.pop());
        let mut next = Box::pin(slots.acquire(busy));
        assert!(futures_util::poll!(next.as_mut()).is_pending());

        Ok(())
    }

    #[tokio::test(start_paused = true)]
    async fn overflow_waiters_have_a_shorter_deadline() -> Result<(), DatabaseRejection> {
        let slots = SessionSlots::new();
        let tenant = Uuid::new_v4();
        let mut running = Vec::new();

        for _ in 0..TenantPoolLimits::DATA_API.connections_per_tenant {
            running.push(slots.acquire(tenant).await?);
        }

        let mut waiting = Vec::new();

        for _ in 0..MAX_QUEUED_PER_PROJECT {
            let mut request = Box::pin(slots.acquire(tenant));
            assert!(futures_util::poll!(request.as_mut()).is_pending());
            waiting.push(request);
        }

        let started = tokio::time::Instant::now();
        assert!(matches!(
            slots.acquire(tenant).await,
            Err(DatabaseRejection::DatabaseBusy)
        ));
        let elapsed = started.elapsed();
        assert!(elapsed >= BURST_WAIT);
        assert!(elapsed < SLOT_WAIT);

        Ok(())
    }
}
