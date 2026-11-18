use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::json;

use crate::support::{TEST_PASSWORD, TestResult, TestServer, error_code, unique_email};

#[derive(Deserialize)]
struct VerifiedUser {
    email_verified_at: Option<String>,
}

#[tokio::test]
async fn signup_sends_a_verification_link_that_works_once() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    let email = unique_email("verify");
    server.sign_up(&tenant, &email).await?;

    let token = server.wait_for_email_token(&email).await?;
    assert!(token.starts_with("nc_ev_"));

    let body = json!({ "token": token });
    let verified = server
        .post_auth("/auth/v1/verify-email", api_key, body.clone())
        .await?;
    assert_eq!(verified.status(), StatusCode::OK);
    let user: VerifiedUser = verified.json().await?;
    assert!(user.email_verified_at.is_some());

    let reused = server
        .post_auth("/auth/v1/verify-email", api_key, body)
        .await?;
    assert_eq!(reused.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(reused).await?, "invalid_token");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn password_reset_changes_the_password_and_ends_sessions() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    let email = unique_email("reset");
    let session = server.sign_up(&tenant, &email).await?;
    // Wait for the signup email first, so the reset email is the newest one afterwards.
    server.wait_for_email_token(&email).await?;

    let recover = server
        .post_auth("/auth/v1/recover", api_key, json!({ "email": email }))
        .await?;
    assert_eq!(recover.status(), StatusCode::ACCEPTED);
    let token = wait_for_token_with_prefix(&server, &email, "nc_pr_").await?;

    let new_password = "a brand new password";
    let reset_body = json!({ "token": token, "password": new_password });
    let reset = server
        .post_auth("/auth/v1/reset-password", api_key, reset_body)
        .await?;
    assert_eq!(reset.status(), StatusCode::NO_CONTENT);

    let old_session = server.refresh(&tenant, &session.refresh_token).await?;
    assert_eq!(old_session.status(), StatusCode::UNAUTHORIZED);

    let old_login = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
    let old_password = server
        .post_auth("/auth/v1/login", api_key, old_login)
        .await?;
    assert_eq!(old_password.status(), StatusCode::UNAUTHORIZED);

    let new_login = json!({ "email": email, "password": new_password });
    let new_password_login = server
        .post_auth("/auth/v1/login", api_key, new_login)
        .await?;
    assert_eq!(new_password_login.status(), StatusCode::OK);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn recovery_does_not_reveal_unknown_emails() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;

    for raw_email in [unique_email("nobody"), "not-an-email".to_owned()] {
        let body = json!({ "email": raw_email });
        let recover = server
            .post_auth("/auth/v1/recover", api_key, body.clone())
            .await?;
        assert_eq!(recover.status(), StatusCode::ACCEPTED);
        let resend = server
            .post_auth("/auth/v1/verify-email/resend", api_key, body)
            .await?;
        assert_eq!(resend.status(), StatusCode::ACCEPTED);
    }

    let bad_token = json!({ "token": "nc_pr_forged", "password": "whatever password" });
    let reset = server
        .post_auth("/auth/v1/reset-password", api_key, bad_token)
        .await?;
    assert_eq!(reset.status(), StatusCode::BAD_REQUEST);

    server.drop_tenant(&tenant).await
}

/// The reset email is sent in the background, so the newest email may still be the older one.
async fn wait_for_token_with_prefix(
    server: &TestServer,
    email: &str,
    prefix: &str,
) -> TestResult<String> {
    for _ in 0..50 {
        let token = server.wait_for_email_token(email).await?;

        if token.starts_with(prefix) {
            return Ok(token);
        }

        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    Err(format!("no email with a {prefix} token arrived").into())
}
