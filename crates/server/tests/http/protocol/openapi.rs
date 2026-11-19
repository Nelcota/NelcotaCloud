use reqwest::StatusCode;
use serde_json::Value;

use crate::support::{TestResult, TestServer};

#[tokio::test]
async fn serves_the_openapi_document() -> TestResult {
    let server = TestServer::start().await?;

    let response = server
        .client
        .get(server.url("/openapi.json"))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::OK);
    let document: Value = response.json().await?;
    let signup = document.pointer("/paths/~1auth~1v1~1signup/post");
    assert!(signup.is_some());
    Ok(())
}
