use reqwest::StatusCode;
use serde_json::{Value, json};

use server::shared::crypto::hex_encoding::encode_hex;
use server::shared::crypto::random_bytes::random_bytes;

use crate::support::{CreatedTenant, TEST_PASSWORD, TestResult, TestServer, field, unique_email};

async fn audit_page(server: &TestServer, tenant: &CreatedTenant, query: &str) -> TestResult<Value> {
    let response = server
        .client
        .get(server.url(&format!("/auth/v1/admin/audit-events{query}")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

async fn log_in(
    server: &TestServer,
    tenant: &CreatedTenant,
    password: &str,
) -> TestResult<StatusCode> {
    let body = json!({ "email": tenant_user_email(tenant), "password": password });
    let response = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, body)
        .await?;

    Ok(response.status())
}

fn tenant_user_email(tenant: &CreatedTenant) -> String {
    format!("audit-{}@example.com", tenant.slug)
}

#[tokio::test]
async fn records_logins_and_failed_attempts() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &tenant_user_email(&tenant)).await?;

    // Random, so no fixed string in the code is ever used as a password.
    let wrong_password = encode_hex(&random_bytes::<12>());
    assert_eq!(
        log_in(&server, &tenant, &wrong_password).await?,
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        log_in(&server, &tenant, TEST_PASSWORD.as_str()).await?,
        StatusCode::OK
    );

    let page = audit_page(&server, &tenant, "").await?;
    let logged_in = field(&page, "/events/0");
    assert_eq!(field(logged_in, "/action"), "logged_in");
    assert_eq!(field(logged_in, "/actor"), "user");
    assert_eq!(field(logged_in, "/login_method"), "password");
    assert_eq!(field(logged_in, "/user_id"), &json!(session.user.id));
    assert_eq!(
        field(logged_in, "/ip_address"),
        server.client_ip.to_string().as_str()
    );
    assert_eq!(
        field(logged_in, "/email"),
        &json!(tenant_user_email(&tenant))
    );
    let failed = field(&page, "/events/1");
    assert_eq!(field(failed, "/action"), "login_failed");
    assert_eq!(field(failed, "/user_id"), &json!(session.user.id));
    assert_eq!(field(failed, "/email"), &json!(tenant_user_email(&tenant)));
    assert_eq!(field(&page, "/next_before"), &Value::Null);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn records_admin_actions_by_user_with_pages() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let banned = server.sign_up(&tenant, &unique_email("audit-ban")).await?;
    let other = server
        .sign_up(&tenant, &unique_email("audit-other"))
        .await?;
    for (user_id, action) in [
        (banned.user.id, "ban"),
        (other.user.id, "ban"),
        (banned.user.id, "unban"),
    ] {
        let path = format!("/auth/v1/admin/users/{user_id}/{action}");
        let response = server
            .client
            .post(server.url(&path))
            .header("apikey", &tenant.secret_key)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::OK);
    }

    // Only the admin changes: the user's own signup is in the log too.
    let query = format!("?user_id={}&kind=changes&limit=1", banned.user.id);
    let first = audit_page(&server, &tenant, &query).await?;
    assert_eq!(field(&first, "/events").as_array().map(Vec::len), Some(1));
    assert_eq!(field(&first, "/events/0/action"), "user_unbanned");
    assert_eq!(field(&first, "/events/0/actor"), "secret_key");
    assert_eq!(field(&first, "/events/0/actor_account_id"), &Value::Null);
    let next_before = field(&first, "/next_before")
        .as_i64()
        .ok_or("expected an older page")?;

    let older = format!("{query}&before={next_before}");
    let second = audit_page(&server, &tenant, &older).await?;
    assert_eq!(field(&second, "/events/0/action"), "user_banned");
    assert_eq!(field(&second, "/next_before"), &Value::Null);
    server.drop_tenant(&tenant).await
}

fn event_actions(page: &Value) -> Vec<String> {
    let events = field(page, "/events")
        .as_array()
        .cloned()
        .unwrap_or_default();

    events
        .iter()
        .map(|event| {
            field(event, "/action")
                .as_str()
                .unwrap_or_default()
                .to_owned()
        })
        .collect()
}

async fn ban(server: &TestServer, tenant: &CreatedTenant, user_id: &str) -> TestResult {
    let path = format!("/auth/v1/admin/users/{user_id}/ban");
    let response = server
        .client
        .post(server.url(&path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    Ok(())
}

async fn audit_summary(
    server: &TestServer,
    tenant: &CreatedTenant,
    query: &str,
) -> TestResult<Value> {
    let path = format!("/auth/v1/admin/audit-events/summary{query}");
    let response = server
        .client
        .get(server.url(&path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

#[tokio::test]
async fn summarizes_the_period_and_the_most_refused_addresses() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &tenant_user_email(&tenant)).await?;
    let wrong_password = encode_hex(&random_bytes::<12>());
    log_in(&server, &tenant, &wrong_password).await?;
    log_in(&server, &tenant, &wrong_password).await?;
    let unknown = json!({ "email": unique_email("nobody"), "password": wrong_password });
    server
        .post_auth("/auth/v1/login", &tenant.publishable_key, unknown)
        .await?;
    log_in(&server, &tenant, TEST_PASSWORD.as_str()).await?;
    ban(&server, &tenant, &session.user.id.to_string()).await?;

    let summary = audit_summary(&server, &tenant, "?days=1").await?;
    assert_eq!(field(&summary, "/logins"), 1);
    assert_eq!(field(&summary, "/active_users"), 1);
    assert_eq!(field(&summary, "/failures"), 3);
    assert_eq!(field(&summary, "/changes"), 1);
    let address = field(&summary, "/failing_addresses/0");
    assert_eq!(
        field(address, "/ip_address"),
        server.client_ip.to_string().as_str()
    );
    assert_eq!(field(address, "/failures"), 3);
    assert_eq!(field(address, "/accounts"), 2);
    assert_eq!(
        field(&summary, "/failing_addresses")
            .as_array()
            .map(Vec::len),
        Some(1)
    );

    // The list honours the same period: the five above and the signup.
    let recent = audit_page(&server, &tenant, "?days=1").await?;
    assert_eq!(event_actions(&recent).len(), 6);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn exports_the_filtered_events_as_csv() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &tenant_user_email(&tenant)).await?;
    let wrong_password = encode_hex(&random_bytes::<12>());
    log_in(&server, &tenant, &wrong_password).await?;
    log_in(&server, &tenant, TEST_PASSWORD.as_str()).await?;
    ban(&server, &tenant, &session.user.id.to_string()).await?;

    let response = server
        .client
        .get(server.url("/auth/v1/admin/audit-events/export?kind=failures&days=1"))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?
        .error_for_status()?;
    let content_type = response.headers().get("content-type").cloned();
    let disposition = response.headers().get("content-disposition").cloned();
    let csv = response.text().await?;
    let lines: Vec<&str> = csv.trim_end().split("\r\n").collect();

    assert_eq!(
        content_type
            .as_ref()
            .map(|value| value.to_str())
            .transpose()?,
        Some("text/csv; charset=utf-8")
    );
    assert!(disposition.is_some_and(|value| {
        value
            .to_str()
            .is_ok_and(|text| text.starts_with("attachment"))
    }));
    assert_eq!(lines.len(), 2, "{csv}");
    assert!(lines.first().is_some_and(|header| {
        header.ends_with("ip_address,failure_reason,user_agent,request_id,details")
    }));
    let row = lines.get(1).ok_or("expected one refused login")?;
    let expected_start = format!(
        "login_failed,{},{}",
        tenant_user_email(&tenant),
        session.user.id
    );
    assert!(row.contains(&expected_start), "{row}");
    assert!(
        row.contains(&format!(",{},wrong_password,", server.client_ip)),
        "{row}"
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_summaries_outside_the_kept_log() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let path = "/auth/v1/admin/audit-events/summary";

    for query in ["?days=0", "?days=91", "?days=many"] {
        let response = server
            .client
            .get(server.url(&format!("{path}{query}")))
            .header("apikey", &tenant.secret_key)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{query}");
    }

    let publishable = server
        .client
        .get(server.url(path))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn filters_events_by_kind() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &tenant_user_email(&tenant)).await?;
    let wrong_password = encode_hex(&random_bytes::<12>());
    log_in(&server, &tenant, &wrong_password).await?;
    log_in(&server, &tenant, TEST_PASSWORD.as_str()).await?;
    ban(&server, &tenant, &session.user.id.to_string()).await?;

    for (kind, action) in [
        ("logins", "logged_in"),
        ("failures", "login_failed"),
        ("changes", "user_banned"),
    ] {
        let page = audit_page(&server, &tenant, &format!("?kind={kind}")).await?;
        assert_eq!(event_actions(&page), vec![action.to_owned()], "{kind}");
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn searches_events_by_email_or_ip_address() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, &tenant_user_email(&tenant)).await?;
    log_in(&server, &tenant, TEST_PASSWORD.as_str()).await?;
    ban(&server, &tenant, &session.user.id.to_string()).await?;

    let by_email = format!("?search={}", tenant.slug.to_uppercase());
    let email_page = audit_page(&server, &tenant, &by_email).await?;
    assert_eq!(
        event_actions(&email_page),
        ["user_banned", "logged_in", "signed_up"]
    );

    // Admin requests carry their IP too, so the secret key's ban matches the address.
    let ip_page = audit_page(&server, &tenant, &format!("?search={}", server.client_ip)).await?;
    assert_eq!(
        event_actions(&ip_page),
        ["user_banned", "logged_in", "signed_up"]
    );

    // The fixture email includes one underscore in its tenant slug.
    for query in ["?search=%25", "?search=__", "?search=nobody"] {
        let page = audit_page(&server, &tenant, query).await?;
        assert_eq!(event_actions(&page), Vec::<String>::new(), "{query}");
    }

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_invalid_pages_and_publishable_keys() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let path = "/auth/v1/admin/audit-events";

    let too_long = format!("?search={}", "a".repeat(255));
    let invalid = [
        "?limit=0",
        "?limit=101",
        "?before=0",
        "?user_id=not-a-uuid",
        "?kind=everything",
        "?search=",
        "?search=%20%20",
        too_long.as_str(),
        "?days=0",
        "?days=91",
    ];

    for query in invalid {
        let response = server
            .client
            .get(server.url(&format!("{path}{query}")))
            .header("apikey", &tenant.secret_key)
            .send()
            .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{query}");
    }

    let publishable = server
        .client
        .get(server.url(path))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}

/// A password typed into the email field must not land in the activity log.
#[tokio::test]
async fn never_records_text_that_is_not_an_email() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let body = json!({ "email": "MinhaSenhaSecreta123", "password": "anything" });

    let response = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, body)
        .await?;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let page = audit_page(&server, &tenant, "").await?;
    let failed = field(&page, "/events/0");
    assert_eq!(field(failed, "/action"), "login_failed");
    assert_eq!(field(failed, "/email"), &Value::Null);
    assert!(page.to_string().contains("MinhaSenhaSecreta123") == false);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn console_accounts_outside_the_project_see_no_activity_or_templates() -> TestResult {
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("owner"))
        .await?;
    let stranger = server
        .sign_up_console_account(&platform, &unique_email("stranger"))
        .await?;
    let body = json!({ "slug": crate::support::random_slug(), "name": "Audit", "site_url": crate::support::TEST_SITE_URL });
    let created: Value = server
        .client
        .post(server.url("/platform/v1/projects"))
        .bearer_auth(&owner.access_token)
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let project_id = field(&created, "/tenant_id")
        .as_str()
        .unwrap_or_default()
        .to_owned();

    for path in [
        "/auth/v1/admin/audit-events",
        "/auth/v1/admin/email-templates",
    ] {
        let project_request = |token: &str| {
            server
                .client
                .get(server.url(path))
                .bearer_auth(token)
                .header("x-nelcota-project", &project_id)
                .send()
        };
        assert_eq!(
            project_request(&owner.access_token).await?.status(),
            StatusCode::OK,
            "{path}"
        );
        assert_eq!(
            project_request(&stranger.access_token).await?.status(),
            StatusCode::FORBIDDEN,
            "{path}"
        );
    }

    server
        .client
        .delete(server.url(&format!("/platform/v1/projects/{project_id}")))
        .bearer_auth(&owner.access_token)
        .send()
        .await?
        .error_for_status()?;
    server.drop_tenant(&platform).await
}
