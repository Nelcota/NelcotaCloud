use futures_util::future::try_join_all;
use oauth_providers::{create_s256_code_challenge, generate_code_verifier};
use reqwest::header::LOCATION;
use reqwest::{Response, StatusCode, Url};
use serde_json::json;

use crate::auth::mfa::user_with_totp;
use crate::fixtures::fake_github::{FAKE_CLIENT_ID, FAKE_CLIENT_SECRET, FakeAccount};
use crate::stress::metrics::{Load, exercise};
use crate::support::{
    CreatedTenant, Session, TEST_PASSWORD, TEST_SITE_URL, TestResult, TestServer, error_code,
    unique_email,
};

mod google;

const APP_CALLBACK: &str = "http://app.test/callback";
const AUTHORIZE_PATH: &str = "/auth/v1/oauth/github/authorize";

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "drives concurrent OAuth flows against disposable test services"]
async fn stress_oauth_login() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;

    let count = 20;
    let trial = exercise("oauth-pkce-login", Load::burst(count, 10), async |index| {
        let email = unique_email("stress-oauth");
        let account = github_account(u64::try_from(index)?, &email, true);
        let session = full_login(&server, &tenant, &account).await?;
        assert_eq!(session.user.email, email);

        Ok("200".to_owned())
    })
    .await;

    server.drop_tenant(&tenant).await?;

    trial?.require(&[("200", count)])
}

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
    let attacker_verifier = generate_code_verifier();

    let stolen = exchange_response(&server, &tenant, (&login_code, &attacker_verifier)).await?;
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
    register_callbacks(&server, &tenant, &["http://app.test/callback?tab=2"]).await?;
    let account = github_account(57, &email, true);
    let challenge = create_s256_code_challenge(&generate_code_verifier());
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
async fn concurrent_app_code_exchanges_issue_independent_sessions() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("devices");
    let account = github_account(64, &email, true);

    let mut codes = Vec::new();

    for _ in 0..8 {
        let login = start_authorization(&server, &tenant).await?;
        let callback = call_back(&server, &login.state, &account.authorization_code()).await?;
        let code = query_value(&callback, "code")?;
        codes.push((code, login.code_verifier));
    }

    let sessions = try_join_all(
        codes
            .iter()
            .map(|(code, verifier)| exchange(&server, &tenant, (code, verifier))),
    )
    .await?;
    let mut refresh_tokens = std::collections::BTreeSet::new();

    for session in sessions {
        assert_eq!(session.user.email, email);
        assert!(refresh_tokens.insert(session.refresh_token));
    }

    assert_eq!(refresh_tokens.len(), 8);
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

    let login = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
    let squatter_login = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, login)
        .await?;
    assert_eq!(squatter_login.status(), StatusCode::UNAUTHORIZED);
    let squatter_refresh = server.refresh(&tenant, &squatter.refresh_token).await?;
    assert_eq!(squatter_refresh.status(), StatusCode::UNAUTHORIZED);

    server.drop_tenant(&tenant).await
}

/// An authenticator the squatter added would otherwise ask the real owner for a code they
/// cannot produce.
#[tokio::test]
async fn taking_over_an_unverified_account_removes_the_squatter_authenticator() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("hijack-mfa");
    let (squatter, _secret) = user_with_totp(&server, &tenant, &email, 0).await?;

    let session = full_login(&server, &tenant, &github_account(8, &email, true)).await?;
    assert_eq!(session.user.id, squatter.user.id);

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
async fn a_provider_outage_is_distinct_from_canceling_the_login() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let login = start_authorization(&server, &tenant).await?;
    let response = server
        .client
        .get(server.url("/auth/v1/oauth/callback"))
        .query(&[
            ("state", login.state.as_str()),
            ("error", "temporarily_unavailable"),
        ])
        .send()
        .await?;
    assert_eq!(query_value(&response, "error")?, "temporarily_unavailable");
    assert_eq!(
        response
            .headers()
            .get("referrer-policy")
            .and_then(|value| value.to_str().ok()),
        Some("no-referrer")
    );

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn an_issued_code_is_invalid_after_the_provider_is_disabled_and_reconfigured() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let login = start_authorization(&server, &tenant).await?;
    let email = unique_email("provider-rotation");
    let account = github_account(761, &email, true);
    let callback = call_back(&server, &login.state, &account.authorization_code()).await?;
    let code = query_value(&callback, "code")?;
    server
        .client
        .delete(server.url("/auth/v1/admin/oauth/github"))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?;
    configure_github(&server, &tenant).await?;

    let refused = exchange_response(&server, &tenant, (&code, &login.code_verifier)).await?;
    assert_eq!(refused.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(error_code(refused).await?, "invalid_oauth_code");
    let fresh = full_login(&server, &tenant, &account).await?;
    assert_eq!(fresh.user.email, email);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn the_callback_uses_current_redirects_and_ip_policy_before_creating_users() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    configure_github(&server, &tenant).await?;
    let email = unique_email("callback-policy");
    let code = github_account(921, &email, true).authorization_code();
    let first = start_authorization(&server, &tenant).await?;
    register_callbacks(&server, &tenant, &["http://app.test/different-callback"]).await?;
    let refused = call_back(&server, &first.state, &code).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);
    assert!(refused.headers().get(LOCATION).is_none());

    register_callbacks(&server, &tenant, &[APP_CALLBACK]).await?;
    let second = start_authorization(&server, &tenant).await?;
    server
        .post_auth(
            "/auth/v1/admin/blocked-addresses",
            &tenant.secret_key,
            json!({ "address": server.client_ip.to_string() }),
        )
        .await?
        .error_for_status()?;
    let blocked = call_back(&server, &second.state, &code).await?;
    assert_eq!(blocked.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(blocked).await?, "address_blocked");
    let mut database = server.tenant_database(&tenant).await?;
    let created: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM users WHERE email = $1)")
        .bind(email)
        .fetch_one(&mut database)
        .await?;
    assert!(created == false);
    drop(database);

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
    register_callbacks(&server, &tenant, &[APP_CALLBACK]).await?;
    let challenge = create_s256_code_challenge(&generate_code_verifier());
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

    let unregistered = AuthorizeParams {
        redirect_to: "http://app.test/another-page",
        ..valid
    };
    let response = authorize(&server, AUTHORIZE_PATH, &unregistered).await?;
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
    register_callbacks(server, tenant, &[APP_CALLBACK]).await
}

async fn register_callbacks(
    server: &TestServer,
    tenant: &CreatedTenant,
    urls: &[&str],
) -> TestResult {
    let response = server
        .client
        .put(server.url("/auth/v1/admin/oauth/redirects"))
        .header("apikey", &tenant.secret_key)
        .json(&json!({ "redirect_urls": urls }))
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::OK);

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
    let verifier = generate_code_verifier();
    let challenge = create_s256_code_challenge(&verifier);
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
    for (key, expected) in [
        ("client_id", FAKE_CLIENT_ID),
        ("scope", "read:user user:email"),
        ("code_challenge_method", "S256"),
    ] {
        assert!(
            location
                .query_pairs()
                .any(|(name, value)| name == key && value == expected)
        );
    }

    Ok(AppLogin {
        state: query_value(&response, "state")?,
        code_verifier: verifier,
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
    let header = response
        .headers()
        .get(LOCATION)
        .ok_or_else(|| format!("expected a redirect, got {}", response.status()))?;

    Ok(Url::parse(header.to_str()?)?)
}

/// Reads a query parameter of the redirect target, checking it goes back to the tenant's site.
fn query_value(response: &Response, name: &str) -> TestResult<String> {
    let location = location(response)?;

    if location.as_str().starts_with(TEST_SITE_URL) == false && name != "state" {
        return Err(format!("redirected outside the tenant site: {location}").into());
    }

    let (_, value) = location
        .query_pairs()
        .find(|(key, _)| key == name)
        .ok_or_else(|| format!("redirect has no {name} parameter: {location}"))?;

    Ok(value.into_owned())
}
