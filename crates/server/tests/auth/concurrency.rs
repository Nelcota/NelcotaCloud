use std::time::Duration;

use reqwest::StatusCode;
use serde_json::json;

use crate::support::{TEST_PASSWORD, TestResult, TestServer, unique_email};

const MAIL_POLL_ATTEMPTS: u32 = 50;
const MAIL_POLL_INTERVAL: Duration = Duration::from_millis(100);
const RESET_TOKEN_PREFIX: &str = "nc_pr_";

/// The first requests of a new tenant open its pool and run its migrations exactly once.
#[tokio::test]
async fn concurrent_first_requests_of_a_new_tenant_all_succeed() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    let sign_up = |prefix: &'static str| {
        let body = json!({ "email": unique_email(prefix), "password": TEST_PASSWORD.as_str() });
        server.post_auth("/auth/v1/signup", api_key, body)
    };

    let (first, second, third, fourth) = tokio::join!(
        sign_up("first"),
        sign_up("second"),
        sign_up("third"),
        sign_up("fourth")
    );

    for response in [first?, second?, third?, fourth?] {
        assert_eq!(response.status(), StatusCode::CREATED);
    }

    server.drop_tenant(&tenant).await
}

/// Two signups racing for one email: one account, the other is told the email is taken.
#[tokio::test]
async fn concurrent_signups_for_one_email_create_one_account() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    let body = json!({ "email": unique_email("race"), "password": TEST_PASSWORD.as_str() });

    let (first, second) = tokio::join!(
        server.post_auth("/auth/v1/signup", api_key, body.clone()),
        server.post_auth("/auth/v1/signup", api_key, body)
    );
    let mut statuses = [first?.status(), second?.status()];
    statuses.sort_unstable();

    assert_eq!(statuses, [StatusCode::CREATED, StatusCode::CONFLICT]);
    server.drop_tenant(&tenant).await
}

/// Two reset links of one user used at once: one wins, the other is refused, and neither
/// deadlocks into a server error.
#[tokio::test]
async fn concurrent_reset_links_of_one_user_succeed_once() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    let email = unique_email("double-reset");
    server.sign_up(&tenant, &email).await?;
    // Wait for the signup email first, so each reset email is the newest one when it arrives.
    server.wait_for_email_token(&email).await?;
    let first_token = request_reset_token(&server, api_key, &email, None).await?;
    let second_token = request_reset_token(&server, api_key, &email, Some(&first_token)).await?;
    let reset_with = |token: &str| {
        let body = json!({ "token": token, "password": "a brand new password" });
        server.post_auth("/auth/v1/reset-password", api_key, body)
    };

    let (first, second) = tokio::join!(reset_with(&first_token), reset_with(&second_token));
    let mut statuses = [first?.status(), second?.status()];
    statuses.sort_unstable();

    assert_eq!(statuses, [StatusCode::NO_CONTENT, StatusCode::BAD_REQUEST]);
    server.drop_tenant(&tenant).await
}

/// Asks for a reset email and waits for a reset token other than `previous`.
async fn request_reset_token(
    server: &TestServer,
    api_key: &str,
    email: &str,
    previous: Option<&str>,
) -> TestResult<String> {
    let recover = server
        .post_auth("/auth/v1/recover", api_key, json!({ "email": email }))
        .await?;
    assert_eq!(recover.status(), StatusCode::ACCEPTED);

    for _ in 0..MAIL_POLL_ATTEMPTS {
        let token = server.wait_for_email_token(email).await?;

        if token.starts_with(RESET_TOKEN_PREFIX) && Some(token.as_str()) != previous {
            return Ok(token);
        }

        tokio::time::sleep(MAIL_POLL_INTERVAL).await;
    }

    Err("no new reset email arrived".into())
}
