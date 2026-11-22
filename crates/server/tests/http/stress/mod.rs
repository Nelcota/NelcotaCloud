pub(super) mod metrics;
mod overload;
mod services;
mod storage;
mod storage_contention;

use crate::support::TestResult;

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "generates HTTP load; run against disposable test services"]
async fn local_http_stress() -> TestResult {
    let services = services::exercise_services().await;
    let storage = storage::exercise_storage().await;

    services?;
    storage
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "saturates one project's query slots; run against disposable test services"]
async fn local_database_overload_stress() -> TestResult {
    overload::exercise_database().await
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "holds a project row while driving concurrent storage writes"]
async fn local_storage_contention_stress() -> TestResult {
    storage_contention::exercise_storage_contention().await
}
