use std::time::Duration;

use reqwest::StatusCode;
use serde_json::json;

use crate::support::{TestResult, TestServer, error_code, unique_email};

const ATTACKER_PASSWORD: &str = "attacker password";
const OWNER_PASSWORD: &str = "the real owner password";
const SIGNUP_BURST: usize = 3;
const MAIL_POLL_ATTEMPTS: u32 = 50;
const MAIL_POLL_INTERVAL: Duration = Duration::from_millis(100);

#[tokio::test]
async fn latest_signup_takes_over_an_unverified_account() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant_with_defaults().await?;
    let api_key = &tenant.publishable_key;
    let email = unique_email("squatted");

    // The attacker registers the victim's email first; nobody can verify it but the victim.
    let attacker = json!({ "email": email, "password": ATTACKER_PASSWORD });
    server
        .post_auth("/auth/v1/signup", api_key, attacker)
        .await?;
    let attacker_link = server.wait_for_email_token(&email).await?;

    let owner = json!({ "email": email, "password": OWNER_PASSWORD });
    let owner_signup = server.post_auth("/auth/v1/signup", api_key, owner).await?;
    assert_eq!(owner_signup.status(), StatusCode::ACCEPTED);
    let owner_link = wait_for_new_token(&server, &email, &attacker_link).await?;

    let stale = server
        .post_auth(
            "/auth/v1/verify-email",
            api_key,
            json!({ "token": attacker_link }),
        )
        .await?;
    assert_eq!(stale.status(), StatusCode::BAD_REQUEST);
    let verified = server
        .post_auth(
            "/auth/v1/verify-email",
            api_key,
            json!({ "token": owner_link }),
        )
        .await?;
    assert_eq!(verified.status(), StatusCode::OK);

    let attacker_login = json!({ "email": email, "password": ATTACKER_PASSWORD });
    let attacker_attempt = server
        .post_auth("/auth/v1/login", api_key, attacker_login)
        .await?;
    assert_eq!(attacker_attempt.status(), StatusCode::UNAUTHORIZED);
    let owner_login = json!({ "email": email, "password": OWNER_PASSWORD });
    let owner_attempt = server
        .post_auth("/auth/v1/login", api_key, owner_login)
        .await?;
    assert_eq!(owner_attempt.status(), StatusCode::OK);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refresh_stops_once_the_tenant_requires_verification() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &unique_email("unverified")).await?;

    let change = server
        .client
        .patch(server.url("/auth/v1/admin/settings"))
        .header("apikey", &tenant.secret_key)
        .json(&json!({ "require_email_verification": true }))
        .send()
        .await?;
    assert_eq!(change.status(), StatusCode::OK);

    let refresh = server.refresh(&tenant, &session.refresh_token).await?;
    assert_eq!(refresh.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(refresh).await?, "email_not_verified");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn limits_signups_per_email() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant_with_defaults().await?;
    let body = json!({ "email": unique_email("flood"), "password": OWNER_PASSWORD });

    for _ in 0..SIGNUP_BURST {
        let signup = server
            .post_auth("/auth/v1/signup", &tenant.publishable_key, body.clone())
            .await?;
        assert_eq!(signup.status(), StatusCode::ACCEPTED);
    }

    let limited = server
        .post_auth("/auth/v1/signup", &tenant.publishable_key, body)
        .await?;
    assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn keeps_the_status_of_non_json_bodies() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let response = server
        .client
        .post(server.url("/auth/v1/login"))
        .header("apikey", &tenant.publishable_key)
        .body("email=a@example.com")
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::UNSUPPORTED_MEDIA_TYPE);

    server.drop_tenant(&tenant).await
}

/// The newest email may still be the previous one while the next is being delivered.
async fn wait_for_new_token(
    server: &TestServer,
    email: &str,
    previous_token: &str,
) -> TestResult<String> {
    for _ in 0..MAIL_POLL_ATTEMPTS {
        let token = server.wait_for_email_token(email).await?;

        if token != previous_token {
            return Ok(token);
        }

        tokio::time::sleep(MAIL_POLL_INTERVAL).await;
    }

    Err("no new email arrived".into())
}
