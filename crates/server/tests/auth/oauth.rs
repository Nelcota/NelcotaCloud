use reqwest::header::LOCATION;
use reqwest::{Response, StatusCode, Url};
use serde_json::json;

use crate::fake_github::{FAKE_CLIENT_ID, FAKE_CLIENT_SECRET, FakeAccount};
use crate::support::{
    CreatedTenant, Session, TEST_PASSWORD, TEST_SITE_URL, TestResult, TestServer, error_code,
    unique_email,
};

const APP_CALLBACK: &str = "http://app.test/callback";

#[tokio::test]
async fn github_login_creates_a_user_through_a_one_time_code() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("octo");
    let account = FakeAccount {
        github_user_id: 4242,
        email: &email,
        is_email_verified: true,
    };

    let state = start_authorization(&server, &tenant).await?;
    let callback = call_back(&server, &state, &account.authorization_code()).await?;
    let login_code = query_value(&callback, "code")?;
    assert!(login_code.starts_with("nc_oc_"));

    let replayed = call_back(&server, &state, &account.authorization_code()).await?;
    assert_eq!(replayed.status(), StatusCode::BAD_REQUEST);

    let session = exchange(&server, &tenant, &login_code).await?;
    assert_eq!(session.user.email, email);
    let reused = exchange_response(&server, &tenant, &login_code).await?;
    assert_eq!(reused.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(error_code(reused).await?, "invalid_oauth_code");

    let second_state = start_authorization(&server, &tenant).await?;
    let second_callback = call_back(&server, &second_state, &account.authorization_code()).await?;
    let second_session =
        exchange(&server, &tenant, &query_value(&second_callback, "code")?).await?;
    assert_eq!(second_session.user.id, session.user.id);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn verified_provider_email_takes_over_an_unverified_password_account() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("hijack");
    // Someone registered the victim's email with a password, without verifying it.
    let squatter = server.sign_up(&tenant, &email).await?;
    let account = FakeAccount {
        github_user_id: 7,
        email: &email,
        is_email_verified: true,
    };

    let state = start_authorization(&server, &tenant).await?;
    let callback = call_back(&server, &state, &account.authorization_code()).await?;
    let session = exchange(&server, &tenant, &query_value(&callback, "code")?).await?;
    assert_eq!(session.user.id, squatter.user.id);

    let login = json!({ "email": email, "password": TEST_PASSWORD });
    let squatter_login = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, login)
        .await?;
    assert_eq!(squatter_login.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn unverified_provider_email_is_refused() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("unverified");
    let account = FakeAccount {
        github_user_id: 99,
        email: &email,
        is_email_verified: false,
    };

    let state = start_authorization(&server, &tenant).await?;
    let callback = call_back(&server, &state, &account.authorization_code()).await?;
    assert_eq!(query_value(&callback, "error")?, "email_not_verified");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_unsafe_or_unconfigured_authorizations() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let path = "/auth/v1/oauth/github/authorize";

    let unconfigured = authorize(&server, path, (&tenant.publishable_key, APP_CALLBACK)).await?;
    assert_eq!(unconfigured.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(unconfigured).await?, "provider_not_configured");

    let publishable_configure = configure_with_key(&server, &tenant.publishable_key).await?;
    assert_eq!(publishable_configure.status(), StatusCode::FORBIDDEN);
    configure_github(&server, &tenant).await?;

    let open_redirect = authorize(
        &server,
        path,
        (&tenant.publishable_key, "https://evil.test/"),
    )
    .await?;
    assert_eq!(open_redirect.status(), StatusCode::BAD_REQUEST);

    let unknown = authorize(
        &server,
        "/auth/v1/oauth/myspace/authorize",
        (&tenant.publishable_key, APP_CALLBACK),
    )
    .await?;
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);

    let forged_state = call_back(&server, "forged-state", "1:a@example.com:true").await?;
    assert_eq!(forged_state.status(), StatusCode::BAD_REQUEST);

    server.drop_tenant(&tenant).await
}

async fn configure_github(server: &TestServer, tenant: &CreatedTenant) -> TestResult {
    let response = configure_with_key(server, &tenant.secret_key).await?;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    Ok(())
}

async fn configure_with_key(server: &TestServer, api_key: &str) -> TestResult<Response> {
    let body = json!({ "client_id": FAKE_CLIENT_ID, "client_secret": FAKE_CLIENT_SECRET });
    let response = server
        .client
        .put(server.url("/auth/v1/admin/oauth/github"))
        .header("apikey", api_key)
        .json(&body)
        .send()
        .await?;

    Ok(response)
}

async fn authorize(
    server: &TestServer,
    path: &str,
    (api_key, redirect_to): (&str, &str),
) -> TestResult<Response> {
    let response = server
        .client
        .get(server.url(path))
        .query(&[("apikey", api_key), ("redirect_to", redirect_to)])
        .send()
        .await?;

    Ok(response)
}

/// Starts a GitHub authorization and returns the `state` sent to the provider.
async fn start_authorization(server: &TestServer, tenant: &CreatedTenant) -> TestResult<String> {
    let path = "/auth/v1/oauth/github/authorize";
    let response = authorize(server, path, (&tenant.publishable_key, APP_CALLBACK)).await?;
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let location = location(&response)?;
    let expected_prefix = format!("{}/login/oauth/authorize", server.fake_github.base_url);
    assert!(location.as_str().starts_with(&expected_prefix));
    assert!(
        location
            .query_pairs()
            .any(|(name, _)| name == "code_challenge")
    );
    assert!(
        location
            .query_pairs()
            .any(|(name, value)| name == "client_id" && value == FAKE_CLIENT_ID)
    );

    query_value(&response, "state")
}

async fn call_back(server: &TestServer, state: &str, code: &str) -> TestResult<Response> {
    let response = server
        .client
        .get(server.url("/auth/v1/oauth/callback"))
        .query(&[("state", state), ("code", code)])
        .send()
        .await?;

    Ok(response)
}

async fn exchange_response(
    server: &TestServer,
    tenant: &CreatedTenant,
    code: &str,
) -> TestResult<Response> {
    let body = json!({ "code": code });

    server
        .post_auth("/auth/v1/oauth/token", &tenant.publishable_key, body)
        .await
}

async fn exchange(server: &TestServer, tenant: &CreatedTenant, code: &str) -> TestResult<Session> {
    let response = exchange_response(server, tenant, code).await?;

    Ok(response.error_for_status()?.json().await?)
}

fn location(response: &Response) -> TestResult<Url> {
    let Some(header) = response.headers().get(LOCATION) else {
        return Err(format!("expected a redirect, got {}", response.status()).into());
    };

    Ok(Url::parse(header.to_str()?)?)
}

/// Reads a query parameter of the redirect target, checking it goes back to the tenant's site.
fn query_value(response: &Response, name: &str) -> TestResult<String> {
    let location = location(response)?;

    if location.as_str().starts_with(TEST_SITE_URL) == false && name != "state" {
        return Err(format!("redirected outside the tenant site: {location}").into());
    }

    let Some((_, value)) = location.query_pairs().find(|(key, _)| key == name) else {
        return Err(format!("redirect has no {name} parameter: {location}").into());
    };

    Ok(value.into_owned())
}
