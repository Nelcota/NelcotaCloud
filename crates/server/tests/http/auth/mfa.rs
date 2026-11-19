use reqwest::{Method, Response, StatusCode};
use serde_json::{Value, json};
use time::OffsetDateTime;
use totp_rs::{Builder, Secret};

use crate::support::{
    CreatedTenant, Session, TEST_PASSWORD, TestResult, TestServer, error_code, field, unique_email,
};

const STEP_SECONDS: i64 = 30;

/// The code an authenticator app shows `steps_from_now` time steps from now.
pub fn totp_code(secret_base32: &str, steps_from_now: i64) -> TestResult<String> {
    let secret = Secret::try_from_base32(secret_base32)?;
    let totp = Builder::new()
        .with_secret(secret)
        .with_account_name("test")
        .build()?;
    let time = OffsetDateTime::now_utc()
        .unix_timestamp()
        .saturating_add(steps_from_now.saturating_mul(STEP_SECONDS));

    Ok(totp.generate(u64::try_from(time)?).to_string())
}

pub async fn user_request(
    server: &TestServer,
    tenant: &CreatedTenant,
    session: &Session,
    request: (Method, &str, Option<Value>),
) -> TestResult<Response> {
    let (method, path, body) = request;
    let mut builder = server
        .client
        .request(method, server.url(path))
        .header("apikey", &tenant.publishable_key)
        .bearer_auth(&session.access_token);

    if let Some(body) = body {
        builder = builder.json(&body);
    }

    Ok(builder.send().await?)
}

/// Signs up, adds an authenticator and verifies it with the code of `steps_from_now`.
pub async fn user_with_totp(
    server: &TestServer,
    tenant: &CreatedTenant,
    email: &str,
    steps_from_now: i64,
) -> TestResult<(Session, String)> {
    let session = server.sign_up(tenant, email).await?;
    let enrollment: Value = user_request(
        server,
        tenant,
        &session,
        (Method::POST, "/auth/v1/mfa/totp", None),
    )
    .await?
    .json()
    .await?;
    let secret = field(&enrollment, "/secret")
        .as_str()
        .unwrap_or_default()
        .to_owned();
    let code = totp_code(&secret, steps_from_now)?;
    let verify_body = Some(json!({ "code": code }));
    let verified = user_request(
        server,
        tenant,
        &session,
        (Method::POST, "/auth/v1/mfa/totp/verify", verify_body),
    )
    .await?;
    assert_eq!(verified.status(), StatusCode::NO_CONTENT);

    Ok((session, secret))
}

pub async fn log_in(server: &TestServer, tenant: &CreatedTenant, email: &str) -> TestResult<Value> {
    let body = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
    let response = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, body)
        .await?;
    assert_eq!(response.status(), StatusCode::OK);

    Ok(response.json().await?)
}

pub async fn challenge(
    server: &TestServer,
    tenant: &CreatedTenant,
    mfa_token: &str,
    code: &str,
) -> TestResult<Response> {
    let body = json!({ "mfa_token": mfa_token, "code": code });

    server
        .post_auth("/auth/v1/mfa/challenge", &tenant.publishable_key, body)
        .await
}

#[tokio::test]
async fn logins_with_totp_need_a_code() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("totp");
    let (session, secret) = user_with_totp(&server, &tenant, &email, 0).await?;
    let status: Value = user_request(
        &server,
        &tenant,
        &session,
        (Method::GET, "/auth/v1/mfa", None),
    )
    .await?
    .json()
    .await?;
    assert_eq!(field(&status, "/totp_enabled"), true);

    let login = log_in(&server, &tenant, &email).await?;
    assert_eq!(field(&login, "/mfa_required"), true);
    assert!(login.get("access_token").is_none());
    let mfa_token = field(&login, "/mfa_token").as_str().unwrap_or_default();

    let wrong = challenge(&server, &tenant, mfa_token, "000000").await?;
    assert_eq!(error_code(wrong).await?, "invalid_mfa_code");
    let next_code = totp_code(&secret, 1)?;
    let passed = challenge(&server, &tenant, mfa_token, &next_code).await?;
    assert_eq!(passed.status(), StatusCode::OK);
    let tokens: Value = passed.json().await?;
    assert!(field(&tokens, "/access_token").is_string());

    let reused = challenge(&server, &tenant, mfa_token, &next_code).await?;
    assert_eq!(reused.status(), StatusCode::BAD_REQUEST);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn a_code_works_only_once() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let (session, secret) = user_with_totp(&server, &tenant, &unique_email("replay"), 0).await?;
    let same_code = totp_code(&secret, 0)?;

    let replayed = user_request(
        &server,
        &tenant,
        &session,
        (
            Method::DELETE,
            "/auth/v1/mfa/totp",
            Some(json!({ "code": same_code })),
        ),
    )
    .await?;
    assert_eq!(error_code(replayed).await?, "invalid_mfa_code");

    let next_code = totp_code(&secret, 1)?;
    let disabled = user_request(
        &server,
        &tenant,
        &session,
        (
            Method::DELETE,
            "/auth/v1/mfa/totp",
            Some(json!({ "code": next_code })),
        ),
    )
    .await?;
    assert_eq!(disabled.status(), StatusCode::NO_CONTENT);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn admins_reset_a_lost_authenticator() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("lost-phone");
    let (session, _) = user_with_totp(&server, &tenant, &email, 0).await?;
    let path = format!("/auth/v1/admin/users/{}/mfa", session.user.id);

    let reset = server
        .client
        .delete(server.url(&path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    assert_eq!(reset.status(), StatusCode::NO_CONTENT);
    let login = log_in(&server, &tenant, &email).await?;
    assert!(field(&login, "/access_token").is_string());
    server.drop_tenant(&tenant).await
}
