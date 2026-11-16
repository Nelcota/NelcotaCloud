use reqwest::{Response, StatusCode};
use serde::Deserialize;
use serde_json::json;

use crate::fake_github::{FAKE_CLIENT_ID, FAKE_CLIENT_SECRET};
use crate::support::{CreatedTenant, TestResult, TestServer};

const GITHUB_PATH: &str = "/auth/v1/admin/oauth/github";
const PROVIDERS_PATH: &str = "/auth/v1/admin/oauth";

#[tokio::test]
async fn lists_configured_providers_without_secrets() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let before = list_providers(&server, &tenant.secret_key).await?;
    assert!(before.is_empty());

    let configured = configure_github(&server, &tenant).await?;
    assert_eq!(configured.status(), StatusCode::NO_CONTENT);
    let response = list_response(&server, &tenant.secret_key).await?;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.text().await?;
    assert!(body.contains(FAKE_CLIENT_SECRET) == false);
    let after: ConfiguredProviders = serde_json::from_str(&body)?;
    let [github] = after.providers.as_slice() else {
        return Err("expected exactly one provider".into());
    };
    assert_eq!(github.provider, "github");
    assert_eq!(github.client_id, FAKE_CLIENT_ID);
    assert!(github.updated_at.is_empty() == false);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn removing_a_provider_stops_its_logins() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let configured = configure_github(&server, &tenant).await?;
    assert_eq!(configured.status(), StatusCode::NO_CONTENT);

    let removed = remove_provider(&server, &tenant.secret_key, GITHUB_PATH).await?;
    assert_eq!(removed.status(), StatusCode::NO_CONTENT);
    let listed = list_providers(&server, &tenant.secret_key).await?;
    assert!(listed.is_empty());

    let again = remove_provider(&server, &tenant.secret_key, GITHUB_PATH).await?;
    assert_eq!(again.status(), StatusCode::NO_CONTENT);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn provider_administration_needs_the_secret_key() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let listed = list_response(&server, &tenant.publishable_key).await?;
    assert_eq!(listed.status(), StatusCode::FORBIDDEN);
    let removed = remove_provider(&server, &tenant.publishable_key, GITHUB_PATH).await?;
    assert_eq!(removed.status(), StatusCode::FORBIDDEN);
    let unknown =
        remove_provider(&server, &tenant.secret_key, "/auth/v1/admin/oauth/myspace").await?;
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);

    server.drop_tenant(&tenant).await
}

async fn configure_github(server: &TestServer, tenant: &CreatedTenant) -> TestResult<Response> {
    let body = json!({ "client_id": FAKE_CLIENT_ID, "client_secret": FAKE_CLIENT_SECRET });
    let response = server
        .client
        .put(server.url(GITHUB_PATH))
        .header("apikey", &tenant.secret_key)
        .json(&body)
        .send()
        .await?;

    Ok(response)
}

#[derive(Deserialize)]
struct ConfiguredProviders {
    providers: Vec<ConfiguredProvider>,
}

#[derive(Deserialize)]
struct ConfiguredProvider {
    provider: String,
    client_id: String,
    updated_at: String,
}

async fn list_response(server: &TestServer, api_key: &str) -> TestResult<Response> {
    let response = server
        .client
        .get(server.url(PROVIDERS_PATH))
        .header("apikey", api_key)
        .send()
        .await?;

    Ok(response)
}

async fn list_providers(server: &TestServer, api_key: &str) -> TestResult<Vec<ConfiguredProvider>> {
    let response = list_response(server, api_key).await?;
    assert_eq!(response.status(), StatusCode::OK);
    let body: ConfiguredProviders = response.json().await?;

    Ok(body.providers)
}

async fn remove_provider(server: &TestServer, api_key: &str, path: &str) -> TestResult<Response> {
    let response = server
        .client
        .delete(server.url(path))
        .header("apikey", api_key)
        .send()
        .await?;

    Ok(response)
}
