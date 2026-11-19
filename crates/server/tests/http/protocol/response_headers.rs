use reqwest::StatusCode;
use reqwest::header::CACHE_CONTROL;
use serde_json::json;

use crate::support::{TEST_PASSWORD, TestResult, TestServer, unique_email};

#[tokio::test]
async fn readiness_accepts_traffic_with_a_reachable_control_plane() -> TestResult {
    let server = TestServer::start().await?;
    let health = server.client.get(server.url("/health")).send().await?;
    let readiness = server.client.get(server.url("/ready")).send().await?;

    assert_eq!(health.status(), StatusCode::OK);
    assert_eq!(health.text().await?, "ok");
    assert_eq!(readiness.status(), StatusCode::OK);
    Ok(())
}

#[tokio::test]
async fn token_responses_forbid_caching() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let body = json!({ "email": unique_email("no-store"), "password": TEST_PASSWORD.as_str() });

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

/// Every response carries a fresh request id, even when the client sent its own.
#[tokio::test]
async fn responses_carry_a_server_generated_request_id() -> TestResult {
    let server = TestServer::start().await?;
    let forged_id = "forged-by-client";

    let response = reqwest::Client::new()
        .get(server.url("/health"))
        .header("x-request-id", forged_id)
        .send()
        .await?;

    let request_id = response.headers().get("x-request-id");
    let request_id = request_id
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    assert_ne!(request_id, forged_id);
    assert!(uuid::Uuid::parse_str(request_id).is_ok());
    Ok(())
}

/// Browsers cache the preflight, so cross-origin calls do not pay an OPTIONS round trip each time.
#[tokio::test]
async fn preflight_answers_are_cacheable() -> TestResult {
    let server = TestServer::start().await?;

    let response = server
        .client
        .request(reqwest::Method::OPTIONS, server.url("/auth/v1/login"))
        .header("origin", "https://app.example.com")
        .header("access-control-request-method", "POST")
        .header("access-control-request-headers", "apikey, content-type")
        .send()
        .await?;

    let max_age = response.headers().get("access-control-max-age");
    assert_eq!(max_age.and_then(|value| value.to_str().ok()), Some("7200"));
    Ok(())
}

/// Browser apps delete keys, users and sessions, so DELETE must pass the CORS preflight.
#[tokio::test]
async fn preflight_allows_delete() -> TestResult {
    let server = TestServer::start().await?;

    let response = server
        .client
        .request(reqwest::Method::OPTIONS, server.url("/auth/v1/sessions"))
        .header("origin", "https://app.example.com")
        .header("access-control-request-method", "DELETE")
        .header("access-control-request-headers", "apikey, authorization")
        .send()
        .await?;

    let allowed = response.headers().get("access-control-allow-methods");
    let allowed = allowed
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    assert!(allowed.contains("DELETE"));
    Ok(())
}
