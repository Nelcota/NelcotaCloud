use reqwest::{Response, StatusCode};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::support::{TEST_SITE_URL, TestResult, TestServer, error_code};

#[derive(Debug, Deserialize)]
struct Settings {
    name: String,
    site_url: Option<String>,
    require_email_verification: bool,
}

#[tokio::test]
async fn new_tenants_require_email_verification_by_default() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant_with_defaults().await?;

    let response = read_settings(&server, &tenant.secret_key).await?;
    assert_eq!(response.status(), StatusCode::OK);
    let settings: Settings = response.json().await?;
    assert!(settings.require_email_verification);
    // Stored normalized, which adds the trailing slash of the root path.
    let expected_site_url = format!("{TEST_SITE_URL}/");
    assert_eq!(
        settings.site_url.as_deref(),
        Some(expected_site_url.as_str())
    );

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn secret_key_changes_only_the_fields_sent() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let secret_key = &tenant.secret_key;

    let change = json!({ "site_url": "https://new-app.test", "require_email_verification": true });
    let response = patch_settings(&server, secret_key, change).await?;
    assert_eq!(response.status(), StatusCode::OK);
    let settings: Settings = response.json().await?;
    assert_eq!(settings.name, "Test tenant");
    assert_eq!(settings.site_url.as_deref(), Some("https://new-app.test/"));
    assert!(settings.require_email_verification);

    let rename = patch_settings(&server, secret_key, json!({ "name": "Renamed" })).await?;
    let renamed: Settings = rename.json().await?;
    assert_eq!(renamed.name, "Renamed");
    assert_eq!(renamed.site_url.as_deref(), Some("https://new-app.test/"));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn rejects_publishable_keys_and_invalid_values() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let publishable_read = read_settings(&server, &tenant.publishable_key).await?;
    assert_eq!(publishable_read.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(publishable_read).await?, "secret_key_required");

    let change = json!({ "require_email_verification": false });
    let publishable_patch = patch_settings(&server, &tenant.publishable_key, change).await?;
    assert_eq!(publishable_patch.status(), StatusCode::FORBIDDEN);

    for invalid in [
        json!({ "site_url": "javascript:alert(1)" }),
        json!({ "name": "   " }),
    ] {
        let response = patch_settings(&server, &tenant.secret_key, invalid).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    server.drop_tenant(&tenant).await
}

async fn read_settings(server: &TestServer, api_key: &str) -> TestResult<Response> {
    let response = server
        .client
        .get(server.url("/auth/v1/admin/settings"))
        .header("apikey", api_key)
        .send()
        .await?;

    Ok(response)
}

async fn patch_settings(server: &TestServer, api_key: &str, body: Value) -> TestResult<Response> {
    let response = server
        .client
        .patch(server.url("/auth/v1/admin/settings"))
        .header("apikey", api_key)
        .json(&body)
        .send()
        .await?;

    Ok(response)
}
