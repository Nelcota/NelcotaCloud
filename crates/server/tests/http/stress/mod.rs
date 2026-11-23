pub(super) mod metrics;
mod overload;
mod provisioning;
mod services;

use crate::support::TestResult;

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "generates HTTP load; run against disposable test services"]
async fn local_http_stress() -> TestResult {
    services::exercise_services().await
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "saturates one project's query slots; run against disposable test services"]
async fn local_database_overload_stress() -> TestResult {
    overload::exercise_database().await
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "provisions concurrent projects on a disposable database server"]
async fn local_provisioning_stress() -> TestResult {
    provisioning::exercise_provisioning().await
}
