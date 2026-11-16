use crate::support::{TEST_PASSWORD, TestResult, TestServer, error_code};
use reqwest::StatusCode;
use serde_json::json;

#[tokio::test]
async fn rejects_tokens_from_another_tenant() -> TestResult {
    let server = TestServer::start().await?;
    let tenant_a = server.create_tenant().await?;
    let tenant_b = server.create_tenant().await?;
    let session_a = server.sign_up(&tenant_a, "cross@example.com").await?;

    let response = server
        .current_user(&tenant_b.publishable_key, &session_a.access_token)
        .await?;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(error_code(response).await?, "invalid_access_token");

    // Users are isolated per tenant database: the same email can sign up in tenant B.
    let session_b = server.sign_up(&tenant_b, "cross@example.com").await?;
    assert_ne!(session_b.user.id, session_a.user.id);

    server.drop_tenant(&tenant_a).await?;
    server.drop_tenant(&tenant_b).await
}

#[tokio::test]
async fn rejects_missing_or_unknown_api_keys() -> TestResult {
    let server = TestServer::start().await?;
    let body = json!({ "email": "a@example.com", "password": TEST_PASSWORD });

    let missing = server
        .client
        .post(server.url("/auth/v1/signup"))
        .json(&body)
        .send()
        .await?;
    assert_eq!(missing.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(error_code(missing).await?, "missing_api_key");

    let unknown = server
        .post_auth("/auth/v1/signup", "nc_pk_unknown", body)
        .await?;
    assert_eq!(unknown.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(error_code(unknown).await?, "invalid_api_key");

    Ok(())
}

#[tokio::test]
async fn rejects_invalid_signups() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;

    let short_password = json!({ "email": "short@example.com", "password": "1234567" });
    let response = server
        .post_auth("/auth/v1/signup", api_key, short_password)
        .await?;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let bad_email = json!({ "email": "not-an-email", "password": TEST_PASSWORD });
    let response = server
        .post_auth("/auth/v1/signup", api_key, bad_email)
        .await?;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    server.sign_up(&tenant, "taken@example.com").await?;
    let duplicate = json!({ "email": "TAKEN@example.com", "password": TEST_PASSWORD });
    let response = server
        .post_auth("/auth/v1/signup", api_key, duplicate)
        .await?;
    assert_eq!(response.status(), StatusCode::CONFLICT);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn login_failures_do_not_reveal_whether_the_email_exists() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    server.sign_up(&tenant, "known@example.com").await?;

    let wrong_password = json!({ "email": "known@example.com", "password": "wrong password" });
    let known = server
        .post_auth("/auth/v1/login", api_key, wrong_password)
        .await?;
    let unknown_email = json!({ "email": "unknown@example.com", "password": "wrong password" });
    let unknown = server
        .post_auth("/auth/v1/login", api_key, unknown_email)
        .await?;

    assert_eq!(known.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(unknown.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(error_code(known).await?, error_code(unknown).await?);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn protects_tenant_creation() -> TestResult {
    let server = TestServer::start().await?;

    let without_token = server.request_tenant("no_admin", None).await?;
    assert_eq!(without_token.status(), StatusCode::UNAUTHORIZED);

    let wrong_token = server
        .request_tenant("no_admin", Some("wrong-token"))
        .await?;
    assert_eq!(wrong_token.status(), StatusCode::UNAUTHORIZED);

    let tenant = server.create_tenant().await?;
    let duplicate = server
        .request_tenant(&tenant.slug, Some(server.admin_token()))
        .await?;
    assert_eq!(duplicate.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(duplicate).await?, "slug_taken");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_tampered_access_tokens() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, "tamper@example.com").await?;
    let tampered = format!("{}x", session.access_token);

    let response = server
        .current_user(&tenant.publishable_key, &tampered)
        .await?;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}
