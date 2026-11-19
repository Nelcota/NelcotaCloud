//! Edge cases of MFA codes, account takeover by magic link, signup and OAuth provider settings.

use reqwest::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::Connection;

use crate::auth::magic_link::{request_link, verify};
use crate::auth::mfa::{challenge, log_in, totp_code, user_request, user_with_totp};
use crate::support::{CreatedTenant, TestResult, TestServer, error_code, field, unique_email};

/// Wrong codes a challenge accepts before the login must start over (`MAX_FAILED_ATTEMPTS`).
const MAX_FAILED_ATTEMPTS: i32 = 5;

async fn mfa_token(server: &TestServer, tenant: &CreatedTenant, email: &str) -> TestResult<String> {
    let login = log_in(server, tenant, email).await?;

    Ok(field(&login, "/mfa_token")
        .as_str()
        .unwrap_or_default()
        .to_owned())
}

async fn reset_mfa(server: &TestServer, tenant: &CreatedTenant, user_id: &str) -> TestResult {
    let path = format!("/auth/v1/admin/users/{user_id}/mfa");
    server
        .client
        .delete(server.url(&path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?;

    Ok(())
}

/// An admin removed the authenticator while the user was at the code prompt: no code can be
/// checked anymore, so the login must start over instead of failing with a server error.
#[tokio::test]
async fn a_challenge_ends_when_the_authenticator_is_reset() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("reset-mid-login");
    let (session, secret) = user_with_totp(&server, &tenant, &email, 0).await?;
    let token = mfa_token(&server, &tenant, &email).await?;
    reset_mfa(&server, &tenant, &session.user.id.to_string()).await?;

    let answered = challenge(&server, &tenant, &token, &totp_code(&secret, 1)?).await?;

    assert_eq!(answered.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(answered).await?, "invalid_token");
    server.drop_tenant(&tenant).await
}

/// Wrong codes are counted even though each request fails, so guessing ends the challenge;
/// after that even the right code is refused.
///
/// The per-account rate limit (5 codes a minute, one already spent confirming the
/// authenticator) stops a guesser before a fresh challenge runs out, so the challenge starts
/// one wrong code short of its limit.
#[tokio::test]
async fn the_last_wrong_code_uses_the_challenge_up() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("guesser");
    let (_, secret) = user_with_totp(&server, &tenant, &email, 0).await?;
    let token = mfa_token(&server, &tenant, &email).await?;
    let mut tenant_database = server.tenant_database(&tenant).await?;
    sqlx::query("UPDATE mfa_challenges SET failed_attempts = $1")
        .bind(MAX_FAILED_ATTEMPTS - 1)
        .execute(&mut tenant_database)
        .await?;
    tenant_database.close().await?;

    let wrong = challenge(&server, &tenant, &token, "000000").await?;
    assert_eq!(error_code(wrong).await?, "invalid_mfa_code");
    let right_code = challenge(&server, &tenant, &token, &totp_code(&secret, 1)?).await?;

    assert_eq!(error_code(right_code).await?, "invalid_token");
    server.drop_tenant(&tenant).await
}

/// Disabling needs an active authenticator and a right code; verifying needs a pending one.
#[tokio::test]
async fn totp_changes_need_the_matching_authenticator() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let without_totp = server.sign_up(&tenant, &unique_email("plain")).await?;
    let code = Some(json!({ "code": "123456" }));

    let disable = (Method::DELETE, "/auth/v1/mfa/totp", code.clone());
    let disabled = user_request(&server, &tenant, &without_totp, disable).await?;
    assert_eq!(disabled.status(), StatusCode::NOT_FOUND);
    let confirm = (Method::POST, "/auth/v1/mfa/totp/verify", code);
    let confirmed = user_request(&server, &tenant, &without_totp, confirm).await?;
    assert_eq!(confirmed.status(), StatusCode::NOT_FOUND);

    let email = unique_email("keeps-totp");
    let (with_totp, _) = user_with_totp(&server, &tenant, &email, 0).await?;
    let wrong = (
        Method::DELETE,
        "/auth/v1/mfa/totp",
        Some(json!({ "code": "000000" })),
    );
    let refused = user_request(&server, &tenant, &with_totp, wrong).await?;
    assert_eq!(error_code(refused).await?, "invalid_mfa_code");
    let login = log_in(&server, &tenant, &email).await?;
    assert_eq!(field(&login, "/mfa_required"), true);
    server.drop_tenant(&tenant).await
}

/// The squatter added an authenticator to an account they never verified; the owner's magic
/// link must not then ask for a code only the squatter has.
#[tokio::test]
async fn a_magic_link_removes_the_squatter_authenticator() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("magic-mfa");
    user_with_totp(&server, &tenant, &email, 0).await?;
    // Wait for the signup email, so the magic link is the newest one afterwards.
    server.wait_for_email_token(&email).await?;
    let token = request_link(&server, &tenant, &email).await?;

    let claimed = verify(&server, &tenant, &token).await?;

    assert_eq!(claimed.status(), StatusCode::OK);
    let session: Value = claimed.json().await?;
    assert!(session.get("mfa_required").is_none());
    assert!(field(&session, "/access_token").is_string());
    server.drop_tenant(&tenant).await
}

/// Without email verification signup logs in at once, so it must say the email is taken
/// rather than log anyone into an existing account.
#[tokio::test]
async fn signup_refuses_a_registered_email_when_verification_is_off() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("taken");
    server.sign_up(&tenant, &email).await?;

    let body = json!({ "email": email, "password": "another password" });
    let again = server
        .post_auth("/auth/v1/signup", &tenant.publishable_key, body)
        .await?;

    assert_eq!(again.status(), StatusCode::CONFLICT);
    assert_eq!(error_code(again).await?, "email_taken");
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn provider_settings_refuse_blank_credentials_and_unknown_providers() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let configure = |path: &str, body: Value| {
        server
            .client
            .put(server.url(path))
            .header("apikey", &tenant.secret_key)
            .json(&body)
            .send()
    };

    let blank = json!({ "client_id": "   ", "client_secret": "secret" });
    let refused = configure("/auth/v1/admin/oauth/github", blank).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);
    let valid = json!({ "client_id": "id", "client_secret": "secret" });
    let unknown = configure("/auth/v1/admin/oauth/myspace", valid).await?;
    assert_eq!(error_code(unknown).await?, "unknown_provider");
    server.drop_tenant(&tenant).await
}
