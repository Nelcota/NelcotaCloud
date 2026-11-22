use std::collections::HashMap;
use std::sync::{Arc, Mutex, PoisonError};
use std::time::Duration;

use reqwest::StatusCode;
use serde_json::{Value, json};
use uuid::Uuid;
use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, Request, ResponseTemplate};

use crate::support::{CreatedTenant, TestResult, TestServer, error_code, field, unique_email};

mod cleanup;

const BUCKETS: &str = "/storage/v1/buckets";

#[tokio::test]
async fn private_storage_supports_the_entire_file_lifecycle() -> TestResult {
    let provider = mock_storage().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let tenant = server.create_tenant().await?;
    let user = server.sign_up(&tenant, &unique_email("file-owner")).await?;
    let bucket = create_bucket(&server, &tenant).await?;
    let bucket_path = format!("{BUCKETS}/{bucket}");

    let listed = server
        .client
        .get(server.url(BUCKETS))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?
        .json::<Value>()
        .await?;
    assert_eq!(text_field(&listed, "/0/id")?, bucket);
    let duplicate = server
        .post_auth(BUCKETS, &tenant.secret_key, json!({ "name": "documents" }))
        .await?;
    assert_eq!(duplicate.status(), StatusCode::CONFLICT);

    let upload_path = format!("{bucket_path}/uploads");
    let payload = json!({ "name": "Document.txt", "content_type": "text/plain", "size_bytes": 3 });
    let upload = server
        .client
        .post(server.url(&upload_path))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&user.access_token)
        .json(&payload)
        .send()
        .await?;
    assert_eq!(upload.status(), StatusCode::CREATED);
    let upload = upload.json::<Value>().await?;
    let object = text_field(&upload, "/object_id")?;
    let object_path = format!("/storage/v1/objects/{object}");
    let object_list = format!("{bucket_path}/objects");
    assert_eq!(
        field(&list_files(&server, &tenant, &object_list).await?, "/items"),
        &json!([])
    );

    let missing = server
        .client
        .post(server.url(&format!("{object_path}/download-url")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    send_upload(&server, &upload).await?;
    confirm_upload(&server, &tenant, &object_path).await?;
    confirm_upload(&server, &tenant, &object_path).await?;
    assert_eq!(
        field(
            &list_files(&server, &tenant, &object_list).await?,
            "/items/0/id"
        ),
        object
    );

    let download = server
        .client
        .post(server.url(&format!("{object_path}/download-url")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?
        .json::<Value>()
        .await?;
    let downloaded = server
        .client
        .get(text_field(&download, "/url")?)
        .send()
        .await?;
    assert_eq!(downloaded.error_for_status()?.text().await?, "abc");

    let delete = server
        .client
        .delete(server.url(&object_path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(delete.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        field(&list_files(&server, &tenant, &object_list).await?, "/items"),
        &json!([])
    );
    let id = Uuid::parse_str(object)?;
    assert!(is_queued(&server, id).await?);

    let logout = server
        .post_auth(
            "/auth/v1/logout",
            &tenant.publishable_key,
            json!({ "refresh_token": user.refresh_token }),
        )
        .await?;
    assert_eq!(logout.status(), StatusCode::NO_CONTENT);
    let refused = server
        .client
        .post(server.url(&upload_path))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&user.access_token)
        .json(&payload)
        .send()
        .await?;
    assert_eq!(refused.status(), StatusCode::UNAUTHORIZED);

    let delete = server
        .client
        .delete(server.url(&bucket_path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(delete.status(), StatusCode::NO_CONTENT);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn storage_checks_project_and_owner_and_preserves_cleanup_after_project_removal() -> TestResult
{
    let provider = mock_storage().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let tenant = server.create_tenant().await?;
    let other = server.create_tenant().await?;
    let owner = server
        .sign_up(&tenant, &unique_email("storage-owner"))
        .await?;
    let foreign = server
        .sign_up(&tenant, &unique_email("storage-other"))
        .await?;
    let bucket = create_bucket(&server, &tenant).await?;
    let upload_path = format!("{BUCKETS}/{bucket}/uploads");
    let payload = json!({ "name": "secret.txt", "content_type": "text/plain", "size_bytes": 3 });

    let no_session = server
        .post_auth(&upload_path, &tenant.publishable_key, payload.clone())
        .await?;
    assert_eq!(no_session.status(), StatusCode::UNAUTHORIZED);
    let wrong_project = server
        .post_auth(&upload_path, &other.secret_key, payload.clone())
        .await?;
    assert_eq!(wrong_project.status(), StatusCode::NOT_FOUND);
    let upload = server
        .client
        .post(server.url(&upload_path))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&owner.access_token)
        .json(&payload)
        .send()
        .await?
        .error_for_status()?
        .json::<Value>()
        .await?;
    let id = Uuid::parse_str(text_field(&upload, "/object_id")?)?;
    let object = format!("/storage/v1/objects/{id}");

    for (key, token) in [
        (&tenant.publishable_key, &foreign.access_token),
        (&other.secret_key, &owner.access_token),
    ] {
        let response = server
            .client
            .delete(server.url(&object))
            .header("apikey", key)
            .bearer_auth(token)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    server.drop_tenant(&tenant).await?;
    assert!(is_queued(&server, id).await?);

    server.drop_tenant(&other).await
}

#[tokio::test]
async fn storage_reports_unavailable_without_r2_configuration() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let response = server
        .client
        .get(server.url(BUCKETS))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn one_reservation_survives_retries_and_confirmation_after_the_put_expires() -> TestResult {
    let provider = mock_storage().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let tenant = server.create_tenant().await?;
    let bucket = create_bucket(&server, &tenant).await?;
    let path = format!("{BUCKETS}/{bucket}/uploads");
    let mut input = json!({
        "name": "resume.txt", "content_type": "text/plain", "size_bytes": 3,
        "request_id": Uuid::new_v4()
    });

    let (first, same) = tokio::try_join!(
        server.post_auth(&path, &tenant.secret_key, input.clone()),
        server.post_auth(&path, &tenant.secret_key, input.clone())
    )?;
    let first: Value = first.error_for_status()?.json().await?;
    let same: Value = same.error_for_status()?.json().await?;
    let object = text_field(&first, "/object_id")?;
    assert_eq!(field(&same, "/object_id"), object);

    let object_path = format!("/storage/v1/objects/{object}");
    let missing = server
        .client
        .post(server.url(&format!("{object_path}/complete")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(missing.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(missing).await?, "storage_upload_missing");

    send_upload(&server, &first).await?;
    sqlx::query(
        "UPDATE storage_objects SET upload_expires_at = now() - interval '1 minute' WHERE id = $1",
    )
    .bind(Uuid::parse_str(object)?)
    .execute(&mut server.control_plane().await?)
    .await?;
    confirm_upload(&server, &tenant, &object_path).await?;

    let reopened: Value = server
        .post_auth(&path, &tenant.secret_key, input.clone())
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&reopened, "/object_id"), object);
    assert_eq!(field(&reopened, "/can_upload"), false);
    let check = server
        .client
        .get(text_field(&reopened, "/verification_url")?)
        .send()
        .await?;
    assert_eq!(check.error_for_status()?.text().await?, "abc");

    input
        .as_object_mut()
        .ok_or("expected upload metadata")?
        .insert("name".to_owned(), json!("a-different-file.txt"));
    let conflict = server.post_auth(&path, &tenant.secret_key, input).await?;
    assert_eq!(
        error_code(conflict).await?,
        "storage_upload_request_conflict"
    );

    let listed = list_files(&server, &tenant, &format!("{BUCKETS}/{bucket}/objects")).await?;
    assert_eq!(field(&listed, "/items").as_array().map(Vec::len), Some(1));
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn account_deletion_queues_the_owners_files_without_removing_other_files() -> TestResult {
    let provider = mock_storage().await;
    let server = TestServer::start_with_storage(provider.uri()).await?;
    let tenant = server.create_tenant().await?;
    let user = server
        .sign_up(&tenant, &unique_email("storage-erasure"))
        .await?;
    let bucket = create_bucket(&server, &tenant).await?;
    let route = format!("{BUCKETS}/{bucket}/uploads");
    let body = json!({ "name": "file.txt", "content_type": "text/plain", "size_bytes": 3 });
    let uploaded: Value = server
        .client
        .post(server.url(&route))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&user.access_token)
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let survivor: Value = server
        .post_auth(&route, &tenant.secret_key, body)
        .await?
        .error_for_status()?
        .json()
        .await?;
    let id = Uuid::parse_str(text_field(&uploaded, "/object_id")?)?;
    let survivor_id = Uuid::parse_str(text_field(&survivor, "/object_id")?)?;

    send_upload(&server, &uploaded).await?;
    confirm_upload(&server, &tenant, &format!("/storage/v1/objects/{id}")).await?;
    server
        .client
        .delete(server.url("/auth/v1/user"))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&user.access_token)
        .send()
        .await?
        .error_for_status()?;

    let mut control = server.control_plane().await?;
    let scheduled = sqlx::query("UPDATE storage_owner_deletions SET next_attempt_at = now() WHERE tenant_id = $1 AND owner_id = $2")
        .bind(tenant.tenant_id)
        .bind(user.user.id)
        .execute(&mut control)
        .await?;
    assert_eq!(scheduled.rows_affected(), 1);
    tokio::time::timeout(Duration::from_secs(20), async {
        loop {
            let queued: bool = sqlx::query_scalar(
                "SELECT EXISTS (SELECT 1 FROM storage_object_deletions WHERE id = $1)",
            )
            .bind(id)
            .fetch_one(&mut control)
            .await?;
            if queued {
                return Ok::<(), sqlx::Error>(());
            }

            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    })
    .await??;

    let remains: (bool, bool) = sqlx::query_as(
        "SELECT EXISTS (SELECT 1 FROM storage_objects WHERE id = $1),
                EXISTS (SELECT 1 FROM storage_objects WHERE id = $2)",
    )
    .bind(id)
    .bind(survivor_id)
    .fetch_one(&mut control)
    .await?;
    assert_eq!(remains, (false, true));
    server.drop_tenant(&tenant).await
}

pub(super) async fn mock_storage() -> MockServer {
    let provider = MockServer::start().await;
    let path = "^/test-files/projects/[^/]+/buckets/[^/]+/[^/]+$";
    let objects = Arc::new(Mutex::new(HashMap::<String, (Vec<u8>, String)>::new()));
    let uploads = Arc::clone(&objects);
    Mock::given(method("PUT"))
        .and(path_regex(path))
        .respond_with(move |request: &Request| {
            let mut objects = uploads.lock().unwrap_or_else(PoisonError::into_inner);
            let entry = objects.entry(request.url.path().to_owned());
            match entry {
                std::collections::hash_map::Entry::Occupied(_) => ResponseTemplate::new(412),
                std::collections::hash_map::Entry::Vacant(entry) => {
                    let kind = request
                        .headers
                        .get("content-type")
                        .and_then(|value| value.to_str().ok())
                        .unwrap_or("application/octet-stream")
                        .to_owned();
                    entry.insert((request.body.clone(), kind));

                    ResponseTemplate::new(200)
                }
            }
        })
        .mount(&provider)
        .await;
    let metadata = Arc::clone(&objects);
    Mock::given(method("HEAD"))
        .and(path_regex(path))
        .respond_with(move |request: &Request| {
            let objects = metadata.lock().unwrap_or_else(PoisonError::into_inner);
            let Some((bytes, content_type)) = objects.get(request.url.path()) else {
                return ResponseTemplate::new(404);
            };

            ResponseTemplate::new(200)
                .insert_header("content-length", bytes.len().to_string())
                .insert_header("content-type", content_type.as_str())
                .insert_header("content-disposition", "attachment; filename=file.txt")
                .insert_header("cache-control", "private, no-store")
        })
        .mount(&provider)
        .await;
    Mock::given(method("GET"))
        .and(path_regex(path))
        .respond_with(move |request: &Request| {
            let objects = objects.lock().unwrap_or_else(PoisonError::into_inner);
            match objects.get(request.url.path()) {
                Some((bytes, _)) => ResponseTemplate::new(200).set_body_bytes(bytes.clone()),
                None => ResponseTemplate::new(404),
            }
        })
        .mount(&provider)
        .await;

    provider
}

pub(super) async fn create_bucket(
    server: &TestServer,
    tenant: &CreatedTenant,
) -> TestResult<String> {
    let response = server
        .post_auth(BUCKETS, &tenant.secret_key, json!({ "name": "documents" }))
        .await?;
    assert_eq!(response.status(), StatusCode::CREATED);
    let bucket = response.json::<Value>().await?;

    Ok(text_field(&bucket, "/id")?.to_owned())
}

async fn list_files(server: &TestServer, tenant: &CreatedTenant, path: &str) -> TestResult<Value> {
    Ok(server
        .client
        .get(server.url(path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?)
}

pub(super) async fn send_upload(server: &TestServer, upload: &Value) -> TestResult {
    let url = text_field(upload, "/url")?;
    let headers = field(upload, "/headers")
        .as_object()
        .ok_or("missing upload headers")?;
    let mut request = server.client.put(url).body("abc");

    for (header, value) in headers {
        request = request.header(header, value.as_str().ok_or("invalid upload header")?);
    }

    request.send().await?.error_for_status()?;
    Ok(())
}

async fn confirm_upload(server: &TestServer, tenant: &CreatedTenant, path: &str) -> TestResult {
    server
        .client
        .post(server.url(&format!("{path}/complete")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?;

    Ok(())
}

fn text_field<'a>(value: &'a Value, path: &str) -> TestResult<&'a str> {
    Ok(field(value, path)
        .as_str()
        .ok_or("expected a string field")?)
}

async fn is_queued(server: &TestServer, id: Uuid) -> TestResult<bool> {
    let mut control = server.control_plane().await?;

    Ok(
        sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM storage_object_deletions WHERE id = $1)")
            .bind(id)
            .fetch_one(&mut control)
            .await?,
    )
}
