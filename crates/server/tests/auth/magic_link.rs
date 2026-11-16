use std::time::Duration;

use reqwest::StatusCode;
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TEST_PASSWORD, TestResult, TestServer, field, unique_email};

const MAGIC_LINK_PREFIX: &str = "nc_ml_";

async fn request_link(
    server: &TestServer,
    tenant: &CreatedTenant,
    email: &str,
) -> TestResult<String> {
    let response = server
        .post_auth(
            "/auth/v1/magic-link",
            &tenant.publishable_key,
            json!({ "email": email }),
        )
        .await?;
    assert_eq!(response.status(), StatusCode::ACCEPTED);

    for _ in 0..50 {
        let token = server.wait_for_email_token(email).await?;

        if token.starts_with(MAGIC_LINK_PREFIX) {
            return Ok(token);
        }

        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    Err("no magic link arrived".into())
}

async fn verify(
    server: &TestServer,
    tenant: &CreatedTenant,
    token: &str,
) -> TestResult<reqwest::Response> {
    server
        .post_auth(
            "/auth/v1/magic-link/verify",
            &tenant.publishable_key,
            json!({ "token": token }),
        )
        .await
}

#[tokio::test]
async fn a_magic_link_signs_a_new_user_up_and_works_once() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant_with_defaults().await?;
    let email = unique_email("magic-new");
    let token = request_link(&server, &tenant, &email).await?;

    let first = verify(&server, &tenant, &token).await?;
    assert_eq!(first.status(), StatusCode::OK);
    let session: Value = first.json().await?;
    assert_eq!(
        field(&session, "/user/email").as_str(),
        Some(email.as_str())
    );
    assert!(field(&session, "/user/email_verified_at").is_string());

    let second = verify(&server, &tenant, &token).await?;
    assert_eq!(second.status(), StatusCode::BAD_REQUEST);
    server.drop_tenant(&tenant).await
}

/// Someone registered the victim's email with a password, never verified it, and kept a
/// session. The victim's magic link drops that password and ends that session.
#[tokio::test]
async fn a_magic_link_takes_over_an_unverified_account() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("magic-takeover");
    let squatter = server.sign_up(&tenant, &email).await?;
    // Wait for the signup email, so the magic link is the newest one afterwards.
    server.wait_for_email_token(&email).await?;
    let token = request_link(&server, &tenant, &email).await?;

    let claimed = verify(&server, &tenant, &token).await?;
    assert_eq!(claimed.status(), StatusCode::OK);

    let squatter_refresh = server.refresh(&tenant, &squatter.refresh_token).await?;
    assert_eq!(squatter_refresh.status(), StatusCode::UNAUTHORIZED);
    let password_login = server
        .post_auth(
            "/auth/v1/login",
            &tenant.publishable_key,
            json!({ "email": email, "password": TEST_PASSWORD }),
        )
        .await?;
    assert_eq!(password_login.status(), StatusCode::UNAUTHORIZED);
    server.drop_tenant(&tenant).await
}
