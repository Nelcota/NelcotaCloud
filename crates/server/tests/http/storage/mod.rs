mod lifecycle;

use reqwest::StatusCode;
use serde_json::{Value, json};
use uuid::Uuid;
use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};

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
    let mut control = server.control_plane().await?;
    sqlx::query(
        "UPDATE storage_objects SET upload_expires_at = now() - interval '1 minute' WHERE id = $1",
    )
    .bind(Uuid::parse_str(object)?)
    .execute(&mut control)
    .await?;
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

async fn mock_storage() -> MockServer {
    let provider = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path_regex("^/test-files/?$"))
        .respond_with(ResponseTemplate::new(200).set_body_raw(
            "<ListBucketResult><IsTruncated>false</IsTruncated><KeyCount>0</KeyCount></ListBucketResult>",
            "application/xml",
        ))
        .mount(&provider)
        .await;
    let path = "^/test-files/projects/[^/]+/buckets/[^/]+/[^/]+$";
    Mock::given(method("PUT"))
        .and(path_regex(path))
        .respond_with(ResponseTemplate::new(200))
        .mount(&provider)
        .await;
    Mock::given(method("HEAD"))
        .and(path_regex(path))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("content-length", "3")
                .insert_header("content-type", "text/plain")
                .insert_header("content-disposition", "attachment; filename=file.txt")
                .insert_header("cache-control", "private, no-store"),
        )
        .mount(&provider)
        .await;
    Mock::given(method("GET"))
        .and(path_regex(path))
        .respond_with(ResponseTemplate::new(200).set_body_string("abc"))
        .mount(&provider)
        .await;

    provider
}

async fn create_bucket(server: &TestServer, tenant: &CreatedTenant) -> TestResult<String> {
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

async fn send_upload(server: &TestServer, upload: &Value) -> TestResult {
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
