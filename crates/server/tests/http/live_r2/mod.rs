use std::io::Write;
use std::time::Duration;

use axum::body::Bytes;
use reqwest::Url;
use serde_json::json;
use server::modules::storage::object_store::r2_config::R2Config;
use tokio::time::{sleep, timeout};
use uuid::Uuid;

use crate::storage::create_bucket;
use crate::stress::metrics::{Load, exercise};
use crate::support::{CreatedTenant, TestResult, TestServer};

mod transfer;

const FILE_BYTES: usize = 64 * 1024;
const TRANSFER_TIMEOUT: Duration = Duration::from_secs(30);
const CLEANUP_TIMEOUT: Duration = Duration::from_secs(120);
const CONCURRENCY_STEPS: [usize; 8] = [1, 2, 4, 8, 16, 32, 64, 128];

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "writes real objects to the configured staging R2 bucket"]
async fn live_storage_ramp() -> TestResult {
    let values = [
        "R2_STRESS_ENDPOINT",
        "R2_STRESS_BUCKET",
        "R2_STRESS_ACCESS_KEY_ID",
        "R2_STRESS_SECRET_ACCESS_KEY",
    ]
    .map(|name| std::env::var(name).ok());
    let config = R2Config::parse(values.each_ref().map(Option::as_deref))?
        .ok_or("set the four R2_STRESS credentials for the staging bucket")?;
    let endpoint = Url::parse(config.endpoint)?;
    require_cloudflare_endpoint(&endpoint)?;
    let server = TestServer::start_with_r2(config).await?;
    let tenant = server.create_tenant().await?;
    writeln!(
        std::io::stdout().lock(),
        "Staging run project: {}",
        tenant.tenant_id
    )?;
    let run = ramp(&server, &tenant, &endpoint).await;
    server.drop_tenant(&tenant).await?;

    if let Err(error) = run {
        // An interrupted PUT may still finish at R2. Preserve the regular deletion grace period.
        writeln!(
            std::io::stdout().lock(),
            "Deferred cleanup project: {}",
            tenant.tenant_id
        )?;

        return Err(error);
    }

    timeout(
        CLEANUP_TIMEOUT,
        clean_finished_uploads(&server, tenant.tenant_id),
    )
    .await?
}

fn require_cloudflare_endpoint(endpoint: &Url) -> TestResult {
    if endpoint.scheme() != "https"
        || endpoint
            .domain()
            .is_some_and(|host| host.ends_with(".r2.cloudflarestorage.com"))
            == false
    {
        return Err("R2_STRESS_ENDPOINT must be a Cloudflare R2 S3 origin".into());
    }

    Ok(())
}

async fn ramp(server: &TestServer, tenant: &CreatedTenant, endpoint: &Url) -> TestResult {
    let bucket = create_bucket(server, tenant).await?;
    let payload = Bytes::from(vec![0x5a; FILE_BYTES]);
    let workload = transfer::LiveTransfer {
        server,
        tenant,
        endpoint,
        upload_route: server.url(&format!("/storage/v1/buckets/{bucket}/uploads")),
        payload,
    };
    timeout(TRANSFER_TIMEOUT, workload.check_preconditions()).await??;

    for concurrency in CONCURRENCY_STEPS {
        let count = concurrency.saturating_mul(4).max(8);
        let trial = exercise(
            "live-r2-transfer",
            Load::burst(count, concurrency),
            async |index| {
                let name = format!("staging-{concurrency}-{index}.bin");
                let attempted = timeout(TRANSFER_TIMEOUT, workload.exercise(name)).await;
                if let Ok(outcome) = attempted {
                    return outcome;
                }

                Ok("workflow: timeout".to_owned())
            },
        )
        .await?;
        trial.require(&[("completed", count)])?;
    }

    Ok(())
}

async fn clean_finished_uploads(server: &TestServer, tenant: Uuid) -> TestResult {
    let mut control = server.control_plane().await?;
    sqlx::query("UPDATE storage_object_deletions SET next_attempt_at = now() WHERE tenant_id = $1")
        .bind(tenant)
        .execute(&mut control)
        .await?;

    loop {
        let count: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM storage_object_deletions WHERE tenant_id = $1",
        )
        .bind(tenant)
        .fetch_one(&mut control)
        .await?;

        if count == 0 {
            let report = json!({ "scenario": "live-r2-cleanup", "outstanding": 0 });
            writeln!(std::io::stdout().lock(), "{report}")?;

            return Ok(());
        }

        sleep(Duration::from_millis(400)).await;
    }
}
