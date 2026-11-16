use reqwest::StatusCode;
use reqwest::header::CACHE_CONTROL;
use serde_json::json;

use crate::support::{TEST_PASSWORD, TestResult, TestServer, unique_email};

#[tokio::test]
async fn token_responses_forbid_caching() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let body = json!({ "email": unique_email("no-store"), "password": TEST_PASSWORD });

    let response = server
        .post_auth("/auth/v1/signup", &tenant.publishable_key, body)
        .await?;

    assert_eq!(response.status(), StatusCode::CREATED);
    let cache_control = response.headers().get(CACHE_CONTROL);
    assert_eq!(
        cache_control.and_then(|value| value.to_str().ok()),
        Some("no-store")
    );
    server.drop_tenant(&tenant).await
}
