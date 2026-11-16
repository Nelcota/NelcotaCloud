use reqwest::StatusCode;
use serde_json::{Value, json};

use crate::support::{TEST_PASSWORD, TestResult, TestServer, error_code, unique_email};

#[tokio::test]
async fn signup_does_not_reveal_registered_emails() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant_with_defaults().await?;
    let api_key = &tenant.publishable_key;
    let body = json!({ "email": unique_email("pending"), "password": TEST_PASSWORD });

    let first = server
        .post_auth("/auth/v1/signup", api_key, body.clone())
        .await?;
    assert_eq!(first.status(), StatusCode::ACCEPTED);
    let first_body: Value = first.json().await?;
    assert_eq!(first_body, json!({ "verification_required": true }));

    let duplicate = server.post_auth("/auth/v1/signup", api_key, body).await?;
    assert_eq!(duplicate.status(), StatusCode::ACCEPTED);
    let duplicate_body: Value = duplicate.json().await?;
    assert_eq!(duplicate_body, first_body);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn login_waits_for_email_verification() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant_with_defaults().await?;
    let api_key = &tenant.publishable_key;
    let email = unique_email("gated");
    let credentials = json!({ "email": email, "password": TEST_PASSWORD });
    server
        .post_auth("/auth/v1/signup", api_key, credentials.clone())
        .await?;

    let unverified = server
        .post_auth("/auth/v1/login", api_key, credentials.clone())
        .await?;
    assert_eq!(unverified.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(unverified).await?, "email_not_verified");

    // A wrong password must not learn that the account exists but is unverified.
    let wrong_password = json!({ "email": email, "password": "wrong password" });
    let wrong = server
        .post_auth("/auth/v1/login", api_key, wrong_password)
        .await?;
    assert_eq!(wrong.status(), StatusCode::UNAUTHORIZED);

    let token = server.wait_for_email_token(&email).await?;
    let verify = server
        .post_auth("/auth/v1/verify-email", api_key, json!({ "token": token }))
        .await?;
    assert_eq!(verify.status(), StatusCode::OK);

    let verified = server
        .post_auth("/auth/v1/login", api_key, credentials)
        .await?;
    assert_eq!(verified.status(), StatusCode::OK);

    server.drop_tenant(&tenant).await
}
