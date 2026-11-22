use std::time::{Duration, Instant};

use serde_json::json;
use sqlx::Connection;

use super::metrics::{Load, exercise, status};
use crate::storage::{create_bucket, mock_storage};
use crate::support::{CreatedTenant, TestResult, TestServer};

const BUCKETS: &str = "/storage/v1/buckets";
const WRITES: usize = 48;
const PROBES: usize = 12;

pub async fn exercise_storage_contention() -> TestResult {
    let provider = mock_storage().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let busy = server.create_tenant().await?;
    let neighbor = server.create_tenant().await?;
    let bucket = create_bucket(&server, &busy).await?;
    let path = format!("{BUCKETS}/{bucket}/uploads");
    let mut connection = server.control_plane().await?;
    let mut slow = connection.begin().await?;
    sqlx::query("SELECT id FROM tenants WHERE id = $1 FOR UPDATE")
        .bind(busy.tenant_id)
        .execute(&mut *slow)
        .await?;

    // Simulate a slow catalog transaction on one project while both projects receive traffic.
    let (reservations, neighbors, unlocked) = tokio::join!(
        queued_reservations(&server, &busy, &path),
        probe_neighbor(&server, &neighbor),
        async {
            tokio::time::sleep(Duration::from_millis(2900)).await;
            slow.rollback().await
        }
    );
    unlocked?;
    server.drop_tenant(&busy).await?;
    server.drop_tenant(&neighbor).await?;

    reservations?;
    neighbors
}

async fn queued_reservations(
    server: &TestServer,
    tenant: &CreatedTenant,
    path: &str,
) -> TestResult {
    let started = Instant::now();
    let report = exercise("storage-contended-reservations", Load::burst(WRITES, WRITES), async |index| {
        let body = json!({ "name": format!("wait-{index}.txt"), "content_type": "text/plain", "size_bytes": 3 });
        let response = server.post_auth(path, &tenant.secret_key, body).await?;

        status(response).await
    })
    .await?;
    report.require(&[("201", WRITES)])?;
    assert!(started.elapsed() < Duration::from_secs(2));

    Ok(())
}

async fn probe_neighbor(server: &TestServer, tenant: &CreatedTenant) -> TestResult {
    tokio::time::sleep(Duration::from_millis(300)).await;
    let report = exercise(
        "storage-neighbor-and-readiness",
        Load::burst(PROBES, PROBES),
        async |index| {
            if index.is_multiple_of(2) {
                let response = server.client.get(server.url("/ready")).send().await?;

                return status(response).await;
            }

            let body = json!({ "name": format!("neighbor-{index}") });
            let response = server.post_auth(BUCKETS, &tenant.secret_key, body).await?;

            status(response).await
        },
    )
    .await?;
    report.require(&[("200", PROBES / 2), ("201", PROBES / 2)])
}
