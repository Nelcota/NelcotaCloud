use std::collections::HashMap;

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use reqwest::StatusCode;
use serde_json::json;
use server::modules::oauth::provider::provider_endpoints::ProviderEndpoints;
use sha2::{Digest, Sha256};
use url::form_urlencoded;
use wiremock::matchers::{header, method, path};
use wiremock::{Mock, MockServer, Request, ResponseTemplate};

use super::{
    APP_CALLBACK, AuthorizeParams, authorize, call_back, exchange, location, query_value,
    register_callbacks,
};
use crate::support::{CreatedTenant, TestResult, TestServer, unique_email};

const CLIENT_ID: &str = "test-google-client";
const CLIENT_SECRET: &str = "test-google-secret";
const PROVIDER_CALLBACK: &str = "http://auth.test/auth/v1/oauth/callback";
const PROVIDER_CODE: &str = "google/code+1";
const PROVIDER_TOKEN: &str = "test-google-access-token";
const APP_VERIFIER: &str = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const APP_CHALLENGE: &str = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

#[tokio::test]
async fn google_login_creates_a_session_after_provider_and_app_pkce() -> TestResult {
    let google = MockServer::start().await;
    let base_url = google.uri();
    let server = google_server(&base_url).await?;
    let tenant = server.create_tenant().await?;
    configure_google(&server, &tenant).await?;
    let (state, challenge) = start_google_authorization(&server, &tenant, &base_url).await?;
    let email = unique_email("google");
    let (_, hosted_domain) = email
        .rsplit_once('@')
        .ok_or("missing fixture email domain")?;
    mock_google_exchange(&google, challenge, &email, Some(hosted_domain)).await;

    let callback = call_back(&server, &state, PROVIDER_CODE).await?;
    let code = query_value(&callback, "code")?;
    let session = exchange(&server, &tenant, (&code, APP_VERIFIER)).await?;
    assert_eq!(session.user.email, email);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn google_requires_inbox_confirmation_for_an_unlinked_external_address() -> TestResult {
    let google = MockServer::start().await;
    let base_url = google.uri();
    let server = google_server(&base_url).await?;
    let tenant = server.create_tenant().await?;
    configure_google(&server, &tenant).await?;
    let email = unique_email("external-google");
    server.sign_up(&tenant, &email).await?;
    let (state, challenge) = start_google_authorization(&server, &tenant, &base_url).await?;
    mock_google_exchange(&google, challenge, &email, None).await;

    let callback = call_back(&server, &state, PROVIDER_CODE).await?;
    assert_eq!(
        query_value(&callback, "error")?,
        "email_confirmation_required"
    );
    let mut database = server.tenant_database(&tenant).await?;
    let linked: bool =
        sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM identities WHERE provider = 'google')")
            .fetch_one(&mut database)
            .await?;
    assert!(linked == false);
    drop(database);

    server.drop_tenant(&tenant).await
}

async fn google_server(base_url: &str) -> TestResult<TestServer> {
    TestServer::start_with_google(Some(ProviderEndpoints {
        authorize_url: format!("{base_url}/o/oauth2/v2/auth"),
        token_url: format!("{base_url}/token"),
        api_base_url: base_url.to_owned(),
    }))
    .await
}

async fn configure_google(server: &TestServer, tenant: &CreatedTenant) -> TestResult {
    let response = server
        .client
        .put(server.url("/auth/v1/admin/oauth/google"))
        .header("apikey", &tenant.secret_key)
        .json(&json!({ "client_id": CLIENT_ID, "client_secret": CLIENT_SECRET }))
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    register_callbacks(server, tenant, &[APP_CALLBACK]).await
}

async fn start_google_authorization(
    server: &TestServer,
    tenant: &CreatedTenant,
    base_url: &str,
) -> TestResult<(String, String)> {
    let params = AuthorizeParams {
        api_key: &tenant.publishable_key,
        redirect_to: APP_CALLBACK,
        code_challenge: APP_CHALLENGE,
    };
    let response = authorize(server, "/auth/v1/oauth/google/authorize", &params).await?;
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let url = location(&response)?;
    assert!(
        url.as_str()
            .starts_with(&format!("{base_url}/o/oauth2/v2/auth?"))
    );

    let query: HashMap<_, _> = url.query_pairs().into_owned().collect();
    for (key, expected) in [
        ("client_id", CLIENT_ID),
        ("redirect_uri", PROVIDER_CALLBACK),
        ("response_type", "code"),
        ("scope", "openid email"),
        ("code_challenge_method", "S256"),
    ] {
        assert_eq!(query.get(key).map(String::as_str), Some(expected));
    }

    let state = query.get("state").ok_or("missing Google OAuth state")?;
    let challenge = query
        .get("code_challenge")
        .ok_or("missing Google PKCE challenge")?;
    assert_ne!(challenge, APP_CHALLENGE);

    Ok((state.clone(), challenge.clone()))
}

async fn mock_google_exchange(
    google: &MockServer,
    challenge: String,
    email: &str,
    hosted_domain: Option<&str>,
) {
    Mock::given(method("POST"))
        .and(path("/token"))
        .and(header("accept", "application/json"))
        .and(header("content-type", "application/x-www-form-urlencoded"))
        .and(move |request: &Request| matches_google_exchange(request, &challenge))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "access_token": PROVIDER_TOKEN, "token_type": "Bearer", "expires_in": 3600,
            "scope": "openid email", "id_token": "unused-provider-id-token"
        })))
        .expect(1)
        .mount(google)
        .await;
    Mock::given(method("GET"))
        .and(path("/v1/userinfo"))
        .and(header("authorization", format!("Bearer {PROVIDER_TOKEN}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "sub": "google-123", "email": email, "email_verified": true, "hd": hosted_domain
        })))
        .expect(1)
        .mount(google)
        .await;
}

fn matches_google_exchange(request: &Request, challenge: &str) -> bool {
    let form: HashMap<_, _> = form_urlencoded::parse(&request.body).collect();
    let required = [
        ("client_id", CLIENT_ID),
        ("client_secret", CLIENT_SECRET),
        ("code", PROVIDER_CODE),
        ("redirect_uri", PROVIDER_CALLBACK),
        ("grant_type", "authorization_code"),
    ];

    required
        .into_iter()
        .all(|(name, expected)| form.get(name).is_some_and(|value| value == expected))
        && form.get("code_verifier").is_some_and(|verifier| {
            URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes())) == challenge
        })
}
