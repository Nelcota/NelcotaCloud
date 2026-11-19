use std::time::Duration;

use reqwest::StatusCode;
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};

/// The stamp is written in the background, so tests wait for it instead of reading it at once.
const STAMP_ATTEMPTS: u32 = 50;
const STAMP_POLL_INTERVAL: Duration = Duration::from_millis(100);

async fn create_publishable(server: &TestServer, tenant: &CreatedTenant) -> TestResult<Value> {
    let response = server
        .post_auth(
            "/auth/v1/admin/api-keys",
            &tenant.secret_key,
            json!({ "kind": "publishable" }),
        )
        .await?;
    assert_eq!(response.status(), StatusCode::CREATED);

    Ok(response.json().await?)
}

/// The key as the key list shows it.
async fn listed_key(
    server: &TestServer,
    tenant: &CreatedTenant,
    key_id: &str,
) -> TestResult<Value> {
    let keys: Vec<Value> = server
        .client
        .get(server.url("/auth/v1/admin/api-keys"))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .json()
        .await?;
    let found = keys.into_iter().find(|key| field(key, "/id") == key_id);

    Ok(found.ok_or_else(|| format!("key {key_id} is not listed"))?)
}

async fn sign_up_with(server: &TestServer, api_key: &str) -> TestResult<StatusCode> {
    let body = json!({ "email": unique_email("last-use"), "password": "correct horse battery" });
    let response = server.post_auth("/auth/v1/signup", api_key, body).await?;

    Ok(response.status())
}

async fn wait_for_last_use(
    server: &TestServer,
    tenant: &CreatedTenant,
    key_id: &str,
) -> TestResult<Value> {
    for _ in 0..STAMP_ATTEMPTS {
        let key = listed_key(server, tenant, key_id).await?;

        if field(&key, "/last_used_at").is_null() == false {
            return Ok(key);
        }

        tokio::time::sleep(STAMP_POLL_INTERVAL).await;
    }

    Err(format!("key {key_id} was never stamped as used").into())
}

#[tokio::test]
async fn a_new_key_has_no_last_use() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let created = create_publishable(&server, &tenant).await?;
    let key_id = field(&created, "/id").as_str().unwrap_or_default();

    let listed = listed_key(&server, &tenant, key_id).await?;

    assert!(field(&listed, "/last_used_at").is_null());
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn using_a_key_records_its_last_use() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let created = create_publishable(&server, &tenant).await?;
    let key_id = field(&created, "/id").as_str().unwrap_or_default();
    let publishable = field(&created, "/key").as_str().unwrap_or_default();

    assert_eq!(
        sign_up_with(&server, publishable).await?,
        StatusCode::CREATED
    );

    let listed = wait_for_last_use(&server, &tenant, key_id).await?;
    let last_used_at = field(&listed, "/last_used_at").as_str().unwrap_or_default();
    let created_at = field(&listed, "/created_at").as_str().unwrap_or_default();
    assert!(last_used_at >= created_at);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn a_revoked_key_is_not_recorded_as_used() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let created = create_publishable(&server, &tenant).await?;
    let key_id = field(&created, "/id").as_str().unwrap_or_default();
    let publishable = field(&created, "/key").as_str().unwrap_or_default();
    let path = format!("/auth/v1/admin/api-keys/{key_id}");
    let revoked = server
        .client
        .delete(server.url(&path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(revoked.status(), StatusCode::NO_CONTENT);

    assert_eq!(
        sign_up_with(&server, publishable).await?,
        StatusCode::UNAUTHORIZED
    );
    tokio::time::sleep(STAMP_POLL_INTERVAL * 5).await;

    let listed = listed_key(&server, &tenant, key_id).await?;
    assert!(field(&listed, "/last_used_at").is_null());
    server.drop_tenant(&tenant).await
}
