use std::collections::BTreeSet;

use serde_json::{Value, json};
use uuid::Uuid;

use super::metrics::{Load, exercise, status};
use crate::storage::{create_bucket, mock_storage, send_upload};
use crate::support::{CreatedTenant, TestResult, TestServer, field};

const BUCKETS: &str = "/storage/v1/buckets";
const MAX_FILE_BYTES: usize = 25 * 1024 * 1024;
const FILES: usize = 64;

pub async fn exercise_storage() -> TestResult {
    let provider = mock_storage().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let tenant = server.create_tenant().await?;
    let bucket = create_bucket(&server, &tenant).await?;
    let route = format!("{BUCKETS}/{bucket}");
    let scenario = StorageWork {
        server: &server,
        tenant: &tenant,
        route: &route,
    };

    let transfer = exercise_transfers(&scenario).await;
    let buckets = exercise_bucket_limit(&scenario).await;
    let quota = exercise_reservations(&scenario).await;
    server.drop_tenant(&tenant).await?;

    transfer?;
    buckets?;
    quota
}

struct StorageWork<'a> {
    server: &'a TestServer,
    tenant: &'a CreatedTenant,
    route: &'a str,
}

async fn exercise_transfers(work: &StorageWork<'_>) -> TestResult {
    let report = exercise("storage-transfer", Load::burst(FILES, 32), async |index| {
        let upload = work
            .server
            .post_auth(
                &format!("{}/uploads", work.route),
                &work.tenant.secret_key,
                upload_input(index, 3),
            )
            .await?
            .error_for_status()?
            .json::<Value>()
            .await?;
        send_upload(work.server, &upload).await?;
        let id = field(&upload, "/object_id")
            .as_str()
            .ok_or("missing object ID")?;
        let (first, second) = tokio::try_join!(complete(work, id), complete(work, id))?;
        assert_eq!(first, second);
        check_download(work, id).await?;

        Ok("completed".to_owned())
    })
    .await?;
    report.require(&[("completed", FILES)])?;
    let ids = list_files(work).await?;
    assert_eq!(ids.len(), FILES);

    Ok(())
}

async fn complete(work: &StorageWork<'_>, id: &str) -> TestResult<Value> {
    let route = format!("/storage/v1/objects/{id}/complete");
    let response = work
        .server
        .client
        .post(work.server.url(&route))
        .header("apikey", &work.tenant.secret_key)
        .send()
        .await?
        .error_for_status()?;

    Ok(response.json().await?)
}

async fn check_download(work: &StorageWork<'_>, id: &str) -> TestResult {
    let route = format!("/storage/v1/objects/{id}/download-url");
    let signed: Value = work
        .server
        .client
        .post(work.server.url(&route))
        .header("apikey", &work.tenant.secret_key)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let url = field(&signed, "/url")
        .as_str()
        .ok_or("missing signed download URL")?;
    let bytes = work
        .server
        .client
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?;
    assert_eq!(bytes.as_ref(), b"abc");

    Ok(())
}

async fn list_files(work: &StorageWork<'_>) -> TestResult<BTreeSet<Uuid>> {
    let mut ids = BTreeSet::new();
    let mut cursor = None;
    let url = work.server.url(&format!("{}/objects?limit=17", work.route));

    for _ in 0..5 {
        let mut request = work
            .server
            .client
            .get(&url)
            .header("apikey", &work.tenant.secret_key);

        if let Some(before) = cursor {
            request = request.query(&[("before", before)]);
        }

        let page: Value = request.send().await?.error_for_status()?.json().await?;
        let items = field(&page, "/items")
            .as_array()
            .ok_or("missing object page")?;
        for item in items {
            let id = field(item, "/id")
                .as_str()
                .ok_or("missing listed object ID")?;
            assert!(
                ids.insert(Uuid::parse_str(id)?),
                "object repeated across pages"
            );
        }

        cursor = field(&page, "/next_cursor")
            .as_str()
            .map(Uuid::parse_str)
            .transpose()?;

        if cursor.is_none() {
            return Ok(ids);
        }
    }

    Err("too many pages in the storage fixture".into())
}

async fn exercise_bucket_limit(work: &StorageWork<'_>) -> TestResult {
    let report = exercise("storage-bucket-limit", Load::burst(56, 56), async |index| {
        let body = json!({ "name": format!("stress-{index}") });
        let response = work
            .server
            .post_auth(BUCKETS, &work.tenant.secret_key, body)
            .await?;

        status(response).await
    })
    .await?;
    report.require(&[("201", 49), ("409 storage_bucket_limit", 7)])
}

async fn exercise_reservations(work: &StorageWork<'_>) -> TestResult {
    let url = format!("{}/uploads", work.route);
    let report = exercise("storage-byte-quota", Load::burst(56, 56), async |index| {
        let response = work
            .server
            .post_auth(
                &url,
                &work.tenant.secret_key,
                upload_input(index, MAX_FILE_BYTES),
            )
            .await?;

        status(response).await
    })
    .await?;
    report.require(&[("201", 40), ("409 storage_quota_exceeded", 16)])
}

fn upload_input(index: usize, size_bytes: usize) -> Value {
    json!({ "name": format!("file-{index}.txt"), "content_type": "text/plain", "size_bytes": size_bytes })
}
