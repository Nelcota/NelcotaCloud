use std::time::Duration;

use futures_util::future::try_join_all;
use reqwest::StatusCode;
use serde_json::json;

use super::mfa::{challenge, log_in, totp_code, user_with_totp};
use crate::support::{Session, TEST_PASSWORD, TestResult, TestServer, field, unique_email};

const MAIL_POLL_ATTEMPTS: u32 = 50;
const MAIL_POLL_INTERVAL: Duration = Duration::from_millis(100);
const RESET_TOKEN_PREFIX: &str = "nc_pr_";

/// The first requests of a new tenant open its pool and run its migrations exactly once.
#[tokio::test]
async fn concurrent_first_requests_of_a_new_tenant_all_succeed() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let api_key = &tenant.publishable_key;
    let responses = try_join_all((0..8).map(|_| {
        let body =
            json!({ "email": unique_email("signup-burst"), "password": TEST_PASSWORD.as_str() });
        server.post_auth("/auth/v1/signup", api_key, body)
    }))
    .await?;

    for response in responses {
        let response = response.error_for_status()?;
        assert_eq!(response.status(), StatusCode::CREATED);
        let session = response.json::<Session>().await?;
        assert!(session.refresh_token.is_empty() == false);
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn concurrent_password_logins_issue_independent_sessions() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("concurrent-login");
    server.sign_up(&tenant, &email).await?;
    let body = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
    let responses = try_join_all(
        (0..8).map(|_| server.post_auth("/auth/v1/login", &tenant.publishable_key, body.clone())),
    )
    .await?;
    let mut tokens = std::collections::BTreeSet::new();

    for response in responses {
        let session = response.error_for_status()?.json::<Session>().await?;
        assert!(tokens.insert(session.refresh_token));
    }

    assert_eq!(tokens.len(), 8);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn concurrent_mfa_completions_issue_one_session() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("concurrent-mfa");
    let (_, secret) = user_with_totp(&server, &tenant, &email, 0).await?;
    let login = log_in(&server, &tenant, &email).await?;
    let token = field(&login, "/mfa_token")
        .as_str()
        .ok_or("missing challenge token")?;
    let code = totp_code(&secret, 1)?;
    let complete = || challenge(&server, &tenant, token, &code);
    let (first, second) = tokio::try_join!(complete(), complete())?;
    let mut statuses = [first.status(), second.status()];
    statuses.sort_unstable();

    assert_eq!(statuses, [StatusCode::OK, StatusCode::BAD_REQUEST]);
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
