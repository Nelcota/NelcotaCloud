use reqwest::StatusCode;
use serde_json::json;

use crate::support::{TestResult, TestServer, error_code, unique_email};

const LOGIN_BURST: usize = 10;
const EMAIL_BURST: usize = 3;

#[tokio::test]
async fn limits_password_guessing_per_email() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    let email = unique_email("guessed");
    server.sign_up(&tenant, &email).await?;
    let wrong = json!({ "email": email, "password": "wrong password" });

    for _ in 0..LOGIN_BURST {
        let attempt = server
            .post_auth("/auth/v1/login", api_key, wrong.clone())
            .await?;
        assert_eq!(attempt.status(), StatusCode::UNAUTHORIZED);
    }

    let limited = server.post_auth("/auth/v1/login", api_key, wrong).await?;
    assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(error_code(limited).await?, "too_many_requests");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn limits_recovery_emails_even_for_unknown_addresses() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    let body = json!({ "email": unique_email("flooded") });

    for _ in 0..EMAIL_BURST {
        let recover = server
            .post_auth("/auth/v1/recover", api_key, body.clone())
            .await?;
        assert_eq!(recover.status(), StatusCode::ACCEPTED);
    }

    let limited = server.post_auth("/auth/v1/recover", api_key, body).await?;
    assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);

    server.drop_tenant(&tenant).await
}
