use std::time::Duration;

use reqwest::{Method, StatusCode};
use serde_json::{Value, json};

use super::support::{CACHE_KEY, CREDENTIAL_QUERY_TESTS, CacheProject, cache_request};
use crate::support::{TestResult, TestServer, error_code, unique_email};

#[tokio::test]
async fn projects_opt_in_and_keep_values_and_credentials_isolated() -> TestResult {
    let _guard = CREDENTIAL_QUERY_TESTS.read().await;
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("cache-owner"))
        .await?;
    let other_owner = server
        .sign_up_console_account(&platform, &unique_email("cache-other"))
        .await?;
    let first = CacheProject::create(&server, &owner).await?;
    let second = CacheProject::create(&server, &other_owner).await?;
    assert_default_settings(&first).await?;
    let second_path = format!("/platform/v1/projects/{}/cache", second.project.tenant_id);
    let forbidden = server
        .client
        .put(server.url(&second_path))
        .bearer_auth(&owner.access_token)
        .json(&json!({ "enabled": true }))
        .send()
        .await?;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    first.set_enabled(true).await?;
    second.set_enabled(true).await?;
    let first_credential = first.issue().await?;
    let second_credential = second.issue().await?;
    assert_lists_only_metadata(&first, &first_credential.id).await?;
    assert_entry_isolation(&first, (&first_credential.token, &second_credential.token)).await?;
    assert_expiration_and_delete(&server, &first_credential.token).await?;
    assert_credential_limit(&second).await?;

    let entry = json!({ "key": CACHE_KEY, "value": "before disable" });
    cache_request(&server, &first_credential.token, ("set", entry))
        .await?
        .error_for_status()?;
    first.set_enabled(false).await?;
    let disabled = cache_request(
        &server,
        &first_credential.token,
        ("get", json!({ "key": CACHE_KEY })),
    )
    .await?;
    assert_eq!(error_code(disabled).await?, "cache_disabled");
    first.set_enabled(true).await?;
    let miss = cache_request(
        &server,
        &first_credential.token,
        ("get", json!({ "key": CACHE_KEY })),
    )
    .await?;
    assert_eq!(error_code(miss).await?, "cache_miss");
    let credential_path = format!("/credentials/{}", first_credential.id);
    let wrong_project = second
        .manage(Method::DELETE, (&credential_path, None))
        .await?;
    assert_eq!(wrong_project.status(), StatusCode::NOT_FOUND);
    first
        .manage(Method::DELETE, (&credential_path, None))
        .await?
        .error_for_status()?;
    let revoked = cache_request(
        &server,
        &first_credential.token,
        ("get", json!({ "key": CACHE_KEY })),
    )
    .await?;
    assert_eq!(revoked.status(), StatusCode::UNAUTHORIZED);

    second.drop().await?;
    let deleted = cache_request(
        &server,
        &second_credential.token,
        ("get", json!({ "key": CACHE_KEY })),
    )
    .await?;
    assert_eq!(deleted.status(), StatusCode::UNAUTHORIZED);
    first.drop().await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn preserves_json_number_precision_on_write_and_read() -> TestResult {
    const VALUE: &str = r#"{"decimal":25.234517478384078,"integer":100000000000000000001}"#;

    let _guard = CREDENTIAL_QUERY_TESTS.read().await;
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("cache-number"))
        .await?;
    let project = CacheProject::create(&server, &owner).await?;
    project.set_enabled(true).await?;
    let credential = project.issue().await?;

    server
        .client
        .post(server.url("/cache/v1/set"))
        .bearer_auth(&credential.token)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(format!(r#"{{"key":"{CACHE_KEY}","value":{VALUE}}}"#))
        .send()
        .await?
        .error_for_status()?;
    let response = cache_request(
        &server,
        &credential.token,
        ("get", json!({ "key": CACHE_KEY })),
    )
    .await?
    .error_for_status()?;

    assert_eq!(response.text().await?, format!(r#"{{"value":{VALUE}}}"#));
    project.drop().await?;
    server.drop_tenant(&platform).await
}

async fn assert_credential_limit(project: &CacheProject<'_>) -> TestResult {
    for _ in 1..10 {
        project.issue().await?;
    }

    let request = ("/credentials", Some(json!({ "name": "Over quota" })));
    let rejected = project.manage(Method::POST, request).await?;
    assert_eq!(error_code(rejected).await?, "cache_credential_limit");

    Ok(())
}

async fn assert_default_settings(project: &CacheProject<'_>) -> TestResult {
    let settings: Value = project
        .manage(Method::GET, ("", None))
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(
        settings,
        json!({ "enabled": false, "configured": true, "credentials": [] })
    );
    let rejected = project
        .manage(
            Method::POST,
            ("/credentials", Some(json!({ "name": "Backend" }))),
        )
        .await?;
    assert_eq!(error_code(rejected).await?, "cache_disabled");

    Ok(())
}

async fn assert_lists_only_metadata(project: &CacheProject<'_>, id: &str) -> TestResult {
    let settings: Value = project
        .manage(Method::GET, ("", None))
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(settings.pointer("/credentials/0/id"), Some(&json!(id)));
    assert!(settings.pointer("/credentials/0/token").is_none());

    Ok(())
}

async fn assert_entry_isolation(project: &CacheProject<'_>, tokens: (&str, &str)) -> TestResult {
    let (first, second) = tokens;
    let server = project.server;
    for (token, value) in [(first, json!(null)), (second, json!({ "stock": 2 }))] {
        let request = ("set", json!({ "key": CACHE_KEY, "value": value }));
        let written = cache_request(server, token, request).await?;
        assert_eq!(written.status(), StatusCode::NO_CONTENT);
        let read = cache_request(server, token, ("get", json!({ "key": CACHE_KEY }))).await?;
        assert_eq!(read.headers()["cache-control"], "no-store");
        assert_eq!(read.json::<Value>().await?, json!({ "value": value }));
    }

    let first_value = cache_request(server, first, ("get", json!({ "key": CACHE_KEY }))).await?;
    assert_eq!(first_value.json::<Value>().await?, json!({ "value": null }));
    project
        .manage(Method::POST, ("/clear", None))
        .await?
        .error_for_status()?;
    let miss = cache_request(server, first, ("get", json!({ "key": CACHE_KEY }))).await?;
    assert_eq!(error_code(miss).await?, "cache_miss");
    let preserved = cache_request(server, second, ("get", json!({ "key": CACHE_KEY }))).await?;
    assert_eq!(
        preserved.json::<Value>().await?,
        json!({ "value": { "stock": 2 } })
    );

    Ok(())
}

async fn assert_expiration_and_delete(server: &TestServer, token: &str) -> TestResult {
    let entry = json!({ "key": CACHE_KEY });
    let invalid = json!({ "key": CACHE_KEY, "value": "temporary", "ttl_seconds": 0 });
    let rejection = cache_request(server, token, ("set", invalid)).await?;
    assert_eq!(rejection.status(), StatusCode::BAD_REQUEST);
    let payload = json!({ "key": CACHE_KEY, "value": "temporary", "ttl_seconds": 1 });
    cache_request(server, token, ("set", payload))
        .await?
        .error_for_status()?;
    tokio::time::sleep(Duration::from_millis(1_050)).await;
    let expired = cache_request(server, token, ("get", entry.clone())).await?;
    assert_eq!(error_code(expired).await?, "cache_miss");

    let payload = json!({ "key": CACHE_KEY, "value": "remove me" });
    cache_request(server, token, ("set", payload))
        .await?
        .error_for_status()?;
    for _ in 0..2 {
        let removed = cache_request(server, token, ("delete", entry.clone())).await?;
        assert_eq!(removed.status(), StatusCode::NO_CONTENT);
    }

    let deleted = cache_request(server, token, ("get", entry)).await?;
    assert_eq!(error_code(deleted).await?, "cache_miss");

    Ok(())
}
