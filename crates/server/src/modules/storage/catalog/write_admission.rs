use std::sync::{Arc, LazyLock};
use std::time::Duration;

use moka::future::Cache;
use tokio::sync::{OwnedSemaphorePermit, Semaphore, SemaphorePermit};
use tokio::time::timeout;
use uuid::Uuid;

use crate::shared::http::api_error::ApiError;

// Leave room in the shared control-plane pool for reads, authentication and other projects.
const CONCURRENT_WRITES: usize = 4;
const WRITE_WAIT: Duration = Duration::from_secs(5);
const MAX_TRACKED_PROJECTS: u64 = 10_000;
const PROJECT_IDLE: Duration = Duration::from_secs(10 * 60);

static WRITES: Semaphore = Semaphore::const_new(CONCURRENT_WRITES);
static PROJECTS: LazyLock<Cache<Uuid, Arc<Semaphore>>> = LazyLock::new(|| {
    Cache::builder()
        .max_capacity(MAX_TRACKED_PROJECTS)
        .time_to_idle(PROJECT_IDLE)
        .build()
});

pub(super) struct StorageWritePermit {
    _project: OwnedSemaphorePermit,
    _instance: SemaphorePermit<'static>,
}

/// Queue before acquiring a database connection. PostgreSQL still serializes writes across replicas.
pub(super) async fn admit_write(tenant: Uuid) -> Result<StorageWritePermit, ApiError> {
    let project = PROJECTS
        .get_with(tenant, async { Arc::new(Semaphore::new(1)) })
        .await;
    let acquire = async {
        let project = project.acquire_owned().await.map_err(ApiError::internal)?;
        let instance = WRITES.acquire().await.map_err(ApiError::internal)?;

        Ok(StorageWritePermit {
            _project: project,
            _instance: instance,
        })
    };

    timeout(WRITE_WAIT, acquire)
        .await
        .map_err(|_| ApiError::ServiceBusy)?
}
