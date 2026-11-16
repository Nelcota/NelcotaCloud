use oauth2::PkceCodeChallenge;
use reqwest::header::LOCATION;
use reqwest::{Response, StatusCode, Url};
use serde_json::json;

use crate::fake_github::{FAKE_CLIENT_ID, FAKE_CLIENT_SECRET, FakeAccount};
use crate::support::{
    CreatedTenant, Session, TEST_PASSWORD, TEST_SITE_URL, TestResult, TestServer, error_code,
    unique_email,
};

const APP_CALLBACK: &str = "http://app.test/callback";
const AUTHORIZE_PATH: &str = "/auth/v1/oauth/github/authorize";

/// What the tenant's app keeps while the user signs in at the provider.
struct AppLogin {
    state: String,
    code_verifier: String,
}

struct AuthorizeParams<'a> {
    api_key: &'a str,
    redirect_to: &'a str,
    code_challenge: &'a str,
}

#[tokio::test]
async fn github_login_creates_a_user_through_a_one_time_code() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("octo");
    let account = github_account(4242, &email, true);

    let login = start_authorization(&server, &tenant).await?;
    let callback = call_back(&server, &login.state, &account.authorization_code()).await?;
    let login_code = query_value(&callback, "code")?;
    assert!(login_code.starts_with("nc_oc_"));

    let replayed = call_back(&server, &login.state, &account.authorization_code()).await?;
    assert_eq!(replayed.status(), StatusCode::BAD_REQUEST);

    let session = exchange(&server, &tenant, (&login_code, &login.code_verifier)).await?;
    assert_eq!(session.user.email, email);
    let reused = exchange_response(&server, &tenant, (&login_code, &login.code_verifier)).await?;
    assert_eq!(reused.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(error_code(reused).await?, "invalid_oauth_code");

    let second_session = full_login(&server, &tenant, &account).await?;
    assert_eq!(second_session.user.id, session.user.id);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn login_code_needs_the_verifier_of_the_app_that_started_the_flow() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("stolen");
    let account = github_account(31, &email, true);

    let login = start_authorization(&server, &tenant).await?;
    let callback = call_back(&server, &login.state, &account.authorization_code()).await?;
    let login_code = query_value(&callback, "code")?;
    let (_, attacker_verifier) = PkceCodeChallenge::new_random_sha256();

    let stolen =
        exchange_response(&server, &tenant, (&login_code, attacker_verifier.secret())).await?;
    assert_eq!(stolen.status(), StatusCode::UNAUTHORIZED);
    // A wrong verifier burns the code, so it cannot be guessed against.
    let late = exchange_response(&server, &tenant, (&login_code, &login.code_verifier)).await?;
    assert_eq!(late.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn planted_codes_in_redirect_to_are_replaced() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("planted");
    let account = github_account(57, &email, true);
    let (challenge, _) = PkceCodeChallenge::new_random_sha256();
    let params = AuthorizeParams {
        api_key: &tenant.publishable_key,
        redirect_to: "http://app.test/callback?code=nc_oc_planted&tab=2",
        code_challenge: challenge.as_str(),
    };

    let response = authorize(&server, AUTHORIZE_PATH, &params).await?;
    let state = query_value(&response, "state")?;
    let callback = call_back(&server, &state, &account.authorization_code()).await?;
    let target = location(&callback)?;
    let codes: Vec<String> = target
        .query_pairs()
        .filter(|(key, _)| key == "code")
        .map(|(_, value)| value.into_owned())
        .collect();

    assert_eq!(codes.len(), 1);
    assert!(codes.iter().all(|code| code != "nc_oc_planted"));
    assert!(
        target
            .query_pairs()
            .any(|(key, value)| key == "tab" && value == "2")
    );

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn login_codes_of_two_devices_are_independent() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("devices");
    let account = github_account(64, &email, true);

    let phone = start_authorization(&server, &tenant).await?;
    let laptop = start_authorization(&server, &tenant).await?;
    let phone_callback = call_back(&server, &phone.state, &account.authorization_code()).await?;
    let laptop_callback = call_back(&server, &laptop.state, &account.authorization_code()).await?;
    let phone_code = query_value(&phone_callback, "code")?;
    let laptop_code = query_value(&laptop_callback, "code")?;

    exchange(&server, &tenant, (&phone_code, &phone.code_verifier)).await?;
    exchange(&server, &tenant, (&laptop_code, &laptop.code_verifier)).await?;

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn verified_provider_email_takes_over_an_unverified_password_account() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("hijack");
    // Someone registered the victim's email with a password, without verifying it, and got a
    // session because this tenant lets unverified users in.
    let squatter = server.sign_up(&tenant, &email).await?;
    let account = github_account(7, &email, true);

    let session = full_login(&server, &tenant, &account).await?;
    assert_eq!(session.user.id, squatter.user.id);

    let login = json!({ "email": email, "password": TEST_PASSWORD });
    let squatter_login = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, login)
        .await?;
    assert_eq!(squatter_login.status(), StatusCode::UNAUTHORIZED);
    let squatter_refresh = server.refresh(&tenant, &squatter.refresh_token).await?;
    assert_eq!(squatter_refresh.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_a_second_account_of_the_same_provider_for_one_user() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("recycled");
    full_login(&server, &tenant, &github_account(100, &email, true)).await?;

    // The email now belongs to a different GitHub account (e.g. it was moved or recycled).
    let other_account = github_account(200, &email, true);
    let login = start_authorization(&server, &tenant).await?;
    let callback = call_back(&server, &login.state, &other_account.authorization_code()).await?;
    assert_eq!(query_value(&callback, "error")?, "account_conflict");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn unverified_provider_email_is_refused() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("unverified");
    let account = github_account(99, &email, false);

    let login = start_authorization(&server, &tenant).await?;
    let callback = call_back(&server, &login.state, &account.authorization_code()).await?;
    assert_eq!(query_value(&callback, "error")?, "email_not_verified");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn blank_callback_code_counts_as_denied_access() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;

    let login = start_authorization(&server, &tenant).await?;
    let callback = call_back(&server, &login.state, "   ").await?;
    assert_eq!(query_value(&callback, "error")?, "access_denied");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_blank_provider_credentials() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    for body in [
        json!({ "client_id": "   ", "client_secret": FAKE_CLIENT_SECRET }),
        json!({ "client_id": FAKE_CLIENT_ID, "client_secret": " \t " }),
    ] {
        let response = server
            .client
            .put(server.url("/auth/v1/admin/oauth/github"))
            .header("apikey", &tenant.secret_key)
            .json(&body)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_unsafe_or_unconfigured_authorizations() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let (challenge, _) = PkceCodeChallenge::new_random_sha256();
    let valid = AuthorizeParams {
        api_key: &tenant.publishable_key,
        redirect_to: APP_CALLBACK,
        code_challenge: challenge.as_str(),
    };

    let unconfigured = authorize(&server, AUTHORIZE_PATH, &valid).await?;
    assert_eq!(unconfigured.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(unconfigured).await?, "provider_not_configured");

    let publishable_configure = configure_with_key(&server, &tenant.publishable_key).await?;
    assert_eq!(publishable_configure.status(), StatusCode::FORBIDDEN);
    configure_github(&server, &tenant).await?;

    let open_redirect = AuthorizeParams {
        redirect_to: "https://evil.test/",
        ..valid
    };
    let response = authorize(&server, AUTHORIZE_PATH, &open_redirect).await?;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let weak_challenge = AuthorizeParams {
        code_challenge: "too-short",
        ..valid
    };
    let response = authorize(&server, AUTHORIZE_PATH, &weak_challenge).await?;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let unknown = authorize(&server, "/auth/v1/oauth/myspace/authorize", &valid).await?;
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);

    let forged_state = call_back(&server, "forged-state", "1:a@example.com:true").await?;
    assert_eq!(forged_state.status(), StatusCode::BAD_REQUEST);

    server.drop_tenant(&tenant).await
}

fn github_account(github_user_id: u64, email: &str, is_email_verified: bool) -> FakeAccount<'_> {
    FakeAccount {
        github_user_id,
        email,
        is_email_verified,
    }
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
    params: &AuthorizeParams<'_>,
) -> TestResult<Response> {
    let response = server
        .client
        .get(server.url(path))
        .query(&[
            ("apikey", params.api_key),
            ("redirect_to", params.redirect_to),
            ("code_challenge", params.code_challenge),
            ("code_challenge_method", "S256"),
        ])
        .send()
        .await?;

    Ok(response)
}

/// Starts a GitHub authorization the way an app would: with its own PKCE pair.
async fn start_authorization(server: &TestServer, tenant: &CreatedTenant) -> TestResult<AppLogin> {
    let (challenge, verifier) = PkceCodeChallenge::new_random_sha256();
    let params = AuthorizeParams {
        api_key: &tenant.publishable_key,
        redirect_to: APP_CALLBACK,
        code_challenge: challenge.as_str(),
    };
    let response = authorize(server, AUTHORIZE_PATH, &params).await?;
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let location = location(&response)?;
    let expected_prefix = format!("{}/login/oauth/authorize", server.fake_github.base_url);
    assert!(location.as_str().starts_with(&expected_prefix));
    assert!(
        location
            .query_pairs()
            .any(|(name, value)| name == "client_id" && value == FAKE_CLIENT_ID)
    );

    Ok(AppLogin {
        state: query_value(&response, "state")?,
        code_verifier: verifier.secret().clone(),
    })
}

async fn full_login(
    server: &TestServer,
    tenant: &CreatedTenant,
    account: &FakeAccount<'_>,
) -> TestResult<Session> {
    let login = start_authorization(server, tenant).await?;
    let callback = call_back(server, &login.state, &account.authorization_code()).await?;
    let login_code = query_value(&callback, "code")?;

    exchange(server, tenant, (&login_code, &login.code_verifier)).await
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
    (code, code_verifier): (&str, &str),
) -> TestResult<Response> {
    let body = json!({ "code": code, "code_verifier": code_verifier });

    server
        .post_auth("/auth/v1/oauth/token", &tenant.publishable_key, body)
        .await
}

async fn exchange(
    server: &TestServer,
    tenant: &CreatedTenant,
    code_and_verifier: (&str, &str),
) -> TestResult<Session> {
    let response = exchange_response(server, tenant, code_and_verifier).await?;

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
