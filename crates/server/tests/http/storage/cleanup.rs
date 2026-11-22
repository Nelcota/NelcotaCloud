use std::time::Duration;

use server::modules::storage::cleanup::storage_cleanup::run_cleanup;
use server::modules::storage::object_store::r2_config::R2Config;
use server::modules::storage::object_store::r2_store::R2Store;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tokio::sync::watch;
use tokio::time::{sleep, timeout};
use uuid::Uuid;
use wiremock::matchers::{method, path, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

use crate::support::TestResult;

#[tokio::test]
async fn cleanup_drains_more_than_one_due_batch_per_tick() -> TestResult {
    const DUE: u64 = 64;
    let pool = isolated_cleanup_pool().await?;
    let tenant = Uuid::new_v4();
    let bucket = Uuid::new_v4();
    let count = i64::try_from(DUE)?;
    sqlx::query(
        "INSERT INTO storage_object_deletions (id, tenant_id, bucket_id, next_attempt_at)
         SELECT gen_random_uuid(), $1, $2, now() FROM generate_series(1, $3::bigint)",
    )
    .bind(tenant)
    .bind(bucket)
    .bind(count)
    .execute(&pool)
    .await?;
    sqlx::query(
        "INSERT INTO storage_objects (id, is_ready, upload_expires_at)
         SELECT gen_random_uuid(), false, now() - interval '20 minutes' FROM generate_series(1, 250)",
    )
    .execute(&pool)
    .await?;
    let endpoint = MockServer::start().await;
    let prefix = format!("^/test-files/projects/{tenant}/buckets/{bucket}/");
    Mock::given(method("DELETE"))
        .and(path_regex(prefix))
        .respond_with(ResponseTemplate::new(204))
        .mount(&endpoint)
        .await;
    let store = cleanup_store(&endpoint);
    let (stop, stopped) = watch::channel(false);
    let ((), progress) = tokio::join!(run_cleanup(pool.clone(), store, stopped), async {
        let started = tokio::time::Instant::now();
        let delivered = wait_for_deletions(&endpoint, DUE).await;
        stop.send_replace(true);

        (delivered, started.elapsed())
    });
    assert_eq!(progress.0, DUE, "due jobs processed in {:?}", progress.1);
    let remaining: (i64, i64) = sqlx::query_as(
        "SELECT (SELECT count(*) FROM storage_objects), (SELECT count(*) FROM storage_object_deletions)",
    )
    .fetch_one(&pool)
    .await?;
    assert_eq!(remaining, (0, 0));

    Ok(())
}

async fn wait_for_deletions(endpoint: &MockServer, target: u64) -> u64 {
    let attempts = 100;
    let mut count = 0;
    for _ in 0..attempts {
        count = endpoint
            .received_requests()
            .await
            .map_or(0, |requests| requests.len());

        if u64::try_from(count).is_ok_and(|count| count >= target) {
            break;
        }

        sleep(Duration::from_millis(50)).await;
    }

    u64::try_from(count).unwrap_or_default()
}

#[tokio::test]
async fn a_failed_storage_deletion_leaves_its_retry_and_other_deletions_finish() -> TestResult {
    let pool = isolated_cleanup_pool().await?;
    let tenant = Uuid::new_v4();
    let bucket = Uuid::new_v4();
    let failed = Uuid::new_v4();
    let removed = Uuid::new_v4();
    queue_deletions(&pool, (tenant, bucket), (failed, removed)).await?;
    let endpoint = MockServer::start().await;
    mock_deletion(
        &endpoint,
        format!("/test-files/projects/{tenant}/buckets/{bucket}/{failed}"),
        403,
    )
    .await;
    mock_deletion(
        &endpoint,
        format!("/test-files/projects/{tenant}/buckets/{bucket}/{removed}"),
        204,
    )
    .await;
    let store = cleanup_store(&endpoint);
    let (stop, stopped) = watch::channel(false);
    let ((), result) = tokio::join!(run_cleanup(pool.clone(), store, stopped), async {
        let result = timeout(Duration::from_secs(5), wait_until_removed(&pool, removed)).await;
        stop.send_replace(true);

        result
    });
    result??;
    endpoint.verify().await;

    let retry_scheduled: bool = sqlx::query_scalar(
        "SELECT next_attempt_at > now() FROM storage_object_deletions WHERE id = $1",
    )
    .bind(failed)
    .fetch_one(&pool)
    .await?;
    assert!(retry_scheduled);

    Ok(())
}

fn cleanup_store(endpoint: &MockServer) -> R2Store {
    R2Store::new(&R2Config {
        endpoint: &endpoint.uri(),
        bucket: "test-files",
        access_key_id: "test-key",
        secret_access_key: "test-secret",
    })
}

async fn isolated_cleanup_pool() -> TestResult<PgPool> {
    let url = dotenvy::var("CONTROL_PLANE_DATABASE_URL")?;
    // One connection lets the worker use session-local tables without claiming another test's jobs.
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await?;
    sqlx::raw_sql(
        "CREATE TEMP TABLE storage_objects (
             id uuid PRIMARY KEY, is_ready bool, upload_expires_at timestamptz
         );
         CREATE TEMP TABLE storage_object_deletions (
             id uuid PRIMARY KEY, tenant_id uuid, bucket_id uuid, next_attempt_at timestamptz
         );",
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

async fn queue_deletions(
    pool: &PgPool,
    project: (Uuid, Uuid),
    objects: (Uuid, Uuid),
) -> TestResult {
    let (tenant, bucket) = project;
    let (first, second) = objects;
    sqlx::query(
        "INSERT INTO storage_object_deletions (id, tenant_id, bucket_id, next_attempt_at)
         VALUES ($1, $3, $4, now() - interval '1 minute'), ($2, $3, $4, now())",
    )
    .bind(first)
    .bind(second)
    .bind(tenant)
    .bind(bucket)
    .execute(pool)
    .await?;

    Ok(())
}

async fn mock_deletion(endpoint: &MockServer, key: String, status: u16) {
    Mock::given(method("DELETE"))
        .and(path(key))
        .respond_with(ResponseTemplate::new(status))
        .expect(1)
        .mount(endpoint)
        .await;
}

async fn wait_until_removed(pool: &PgPool, id: Uuid) -> TestResult {
    loop {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM storage_object_deletions WHERE id = $1)",
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        if exists == false {
            return Ok(());
        }

        sleep(Duration::from_millis(20)).await;
    }
}
