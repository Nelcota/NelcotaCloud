use reqwest::{Response, StatusCode};
use serde_json::{Value, json};

use crate::fixtures::fake_turnstile::{
    SOLVED_TOKEN, TURNSTILE_SECRET, TURNSTILE_SITE_KEY, UNAVAILABLE_TURNSTILE_SECRET,
};
use crate::support::{
    CreatedTenant, TEST_PASSWORD, TestResult, TestServer, error_code, field, unique_email,
};

const ADMIN_CAPTCHA_PATH: &str = "/auth/v1/admin/captcha";

async fn configure(
    server: &TestServer,
    tenant: &CreatedTenant,
    secret: &str,
) -> TestResult<Response> {
    let body = json!({ "site_key": TURNSTILE_SITE_KEY, "secret_key": secret });
    let response = server
        .client
        .put(server.url(ADMIN_CAPTCHA_PATH))
        .header("apikey", &tenant.secret_key)
        .json(&body)
        .send()
        .await?;

    Ok(response)
}

async fn public_site_key(server: &TestServer, tenant: &CreatedTenant) -> TestResult<Value> {
    let response = server
        .client
        .get(server.url("/auth/v1/captcha"))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    let body: Value = response.error_for_status()?.json().await?;

    Ok(field(&body, "/site_key").clone())
}

fn with_token(mut body: Value, token: Option<&str>) -> Value {
    if let (Some(token), Some(object)) = (token, body.as_object_mut()) {
        object.insert("captcha_token".to_owned(), json!(token));
    }

    body
}

async fn sign_up(
    server: &TestServer,
    tenant: &CreatedTenant,
    token: Option<&str>,
) -> TestResult<Response> {
    let body = json!({ "email": unique_email("captcha"), "password": TEST_PASSWORD.as_str() });

    server
        .post_auth(
            "/auth/v1/signup",
            &tenant.publishable_key,
            with_token(body, token),
        )
        .await
}

#[tokio::test]
async fn refuses_a_secret_cloudflare_does_not_know() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let refused = configure(&server, &tenant, "0x4AAAAAAAwrong-secret").await?;

    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(refused).await?, "invalid_captcha_secret");
    assert_eq!(public_site_key(&server, &tenant).await?, Value::Null);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn does_not_enable_captcha_when_the_provider_cannot_verify_settings() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let refused = configure(&server, &tenant, UNAVAILABLE_TURNSTILE_SECRET).await?;
    assert_eq!(refused.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(error_code(refused).await?, "captcha_unavailable");
    assert_eq!(public_site_key(&server, &tenant).await?, Value::Null);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn signup_needs_a_solved_captcha_once_configured() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    assert_eq!(
        sign_up(&server, &tenant, None).await?.status(),
        StatusCode::CREATED
    );

    let configured = configure(&server, &tenant, TURNSTILE_SECRET).await?;
    assert_eq!(configured.status(), StatusCode::OK);
    assert_eq!(
        public_site_key(&server, &tenant).await?,
        json!(TURNSTILE_SITE_KEY)
    );

    let missing = sign_up(&server, &tenant, None).await?;
    assert_eq!(missing.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(missing).await?, "captcha_required");
    let unsolved = sign_up(&server, &tenant, Some("unsolved-token")).await?;
    assert_eq!(unsolved.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(unsolved).await?, "captcha_failed");
    let solved = sign_up(&server, &tenant, Some(SOLVED_TOKEN)).await?;
    assert_eq!(solved.status(), StatusCode::CREATED);

    let removed = server
        .client
        .delete(server.url(ADMIN_CAPTCHA_PATH))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(removed.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        sign_up(&server, &tenant, None).await?.status(),
        StatusCode::CREATED
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn login_and_emailed_links_need_the_captcha_too() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("captcha-login");
    server.sign_up(&tenant, &email).await?;
    configure(&server, &tenant, TURNSTILE_SECRET)
        .await?
        .error_for_status()?;
    let key = &tenant.publishable_key;
    let credentials = json!({ "email": email, "password": TEST_PASSWORD.as_str() });

    let login = server
        .post_auth("/auth/v1/login", key, credentials.clone())
        .await?;
    assert_eq!(error_code(login).await?, "captcha_required");
    let solved = with_token(credentials, Some(SOLVED_TOKEN));
    let login = server.post_auth("/auth/v1/login", key, solved).await?;
    assert_eq!(login.status(), StatusCode::OK);

    for path in [
        "/auth/v1/magic-link",
        "/auth/v1/recover",
        "/auth/v1/verify-email/resend",
    ] {
        let body = json!({ "email": unique_email("captcha-link") });
        let refused = server.post_auth(path, key, body.clone()).await?;
        assert_eq!(refused.status(), StatusCode::BAD_REQUEST, "{path}");
        let accepted = server
            .post_auth(path, key, with_token(body, Some(SOLVED_TOKEN)))
            .await?;
        assert_eq!(accepted.status(), StatusCode::ACCEPTED, "{path}");
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn keeps_the_secret_out_of_every_answer() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let saved = configure(&server, &tenant, TURNSTILE_SECRET)
        .await?
        .text()
        .await?;
    let read = server
        .client
        .get(server.url(ADMIN_CAPTCHA_PATH))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .text()
        .await?;

    assert!(saved.contains(TURNSTILE_SECRET) == false);
    assert!(read.contains(TURNSTILE_SITE_KEY));
    assert!(read.contains(TURNSTILE_SECRET) == false);
    let publishable = server
        .client
        .put(server.url(ADMIN_CAPTCHA_PATH))
        .header("apikey", &tenant.publishable_key)
        .json(&json!({ "site_key": "a", "secret_key": "b" }))
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
