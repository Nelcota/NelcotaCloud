use reqwest::StatusCode;
use serde_json::{Value, json};

use crate::support::{
    CreatedTenant, TEST_PASSWORD, TestResult, TestServer, error_code, field, unique_email,
};

const BLOCKS_PATH: &str = "/auth/v1/admin/blocked-addresses";

async fn block(
    server: &TestServer,
    tenant: &CreatedTenant,
    body: Value,
) -> TestResult<reqwest::Response> {
    let response = server
        .client
        .post(server.url(BLOCKS_PATH))
        .header("apikey", &tenant.secret_key)
        .json(&body)
        .send()
        .await?;

    Ok(response)
}

async fn log_in(
    server: &TestServer,
    tenant: &CreatedTenant,
    email: &str,
) -> TestResult<reqwest::Response> {
    let body = json!({ "email": email, "password": TEST_PASSWORD.as_str() });

    server
        .post_auth("/auth/v1/login", &tenant.publishable_key, body)
        .await
}

#[tokio::test]
async fn a_blocked_address_cannot_log_in_or_sign_up_until_unblocked() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let other = server.create_tenant().await?;
    let email = unique_email("blocked");
    server.sign_up(&tenant, &email).await?;

    let created = block(
        &server,
        &tenant,
        json!({ "address": "127.0.0.1", "note": "brute force" }),
    )
    .await?;
    assert_eq!(created.status(), StatusCode::CREATED);
    let blocked: Value = created.json().await?;
    assert_eq!(field(&blocked, "/network"), "127.0.0.1/32");
    assert_eq!(field(&blocked, "/expires_at"), &Value::Null);

    let refused = log_in(&server, &tenant, &email).await?;
    assert_eq!(refused.status(), StatusCode::FORBIDDEN);
    assert_eq!(error_code(refused).await?, "address_blocked");
    let signup =
        json!({ "email": unique_email("blocked-new"), "password": TEST_PASSWORD.as_str() });
    let refused_signup = server
        .post_auth("/auth/v1/signup", &tenant.publishable_key, signup)
        .await?;
    assert_eq!(refused_signup.status(), StatusCode::FORBIDDEN);
    // A block belongs to one project only.
    let elsewhere = log_in(&server, &other, &email).await?;
    assert_eq!(elsewhere.status(), StatusCode::UNAUTHORIZED);

    let block_id = field(&blocked, "/id").as_str().ok_or("block id")?;
    let removed = server
        .client
        .delete(server.url(&format!("{BLOCKS_PATH}/{block_id}")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(removed.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        log_in(&server, &tenant, &email).await?.status(),
        StatusCode::OK
    );

    let page: Value = server
        .client
        .get(server.url("/auth/v1/admin/audit-events?kind=project"))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&page, "/events/0/action"), "address_unblocked");
    assert_eq!(field(&page, "/events/1/action"), "address_blocked");
    assert_eq!(field(&page, "/events/1/details/network"), "127.0.0.1/32");
    assert_eq!(field(&page, "/events/1/details/note"), "brute force");
    server.drop_tenant(&other).await?;
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn lists_ranges_and_refuses_invalid_or_too_wide_ones() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let range = block(
        &server,
        &tenant,
        json!({ "address": "203.0.113.9/24", "expires_in_hours": 2 }),
    )
    .await?;
    assert_eq!(range.status(), StatusCode::CREATED);
    let range: Value = range.json().await?;
    // The host bits are cleared, so the stored range is the network itself.
    assert_eq!(field(&range, "/network"), "203.0.113.0/24");
    assert!(field(&range, "/expires_at").is_string());

    for address in ["10.0.0.0/8", "not-an-ip", "203.0.113.7/33", ""] {
        let response = block(&server, &tenant, json!({ "address": address })).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{address}");
    }

    let listed: Value = server
        .client
        .get(server.url(BLOCKS_PATH))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(listed.as_array().map(Vec::len), Some(1));

    let publishable = server
        .client
        .get(server.url(BLOCKS_PATH))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
