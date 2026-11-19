use reqwest::StatusCode;
use serde_json::{Value, json};
use time::format_description::well_known::Rfc3339;
use time::{Duration, OffsetDateTime};

use server::shared::crypto::hex_encoding::encode_hex;
use server::shared::crypto::random_bytes::random_bytes;

use crate::support::{CreatedTenant, TEST_PASSWORD, TestResult, TestServer, field};

const LIST_PATH: &str = "/auth/v1/admin/audit-events";
const SUMMARY_PATH: &str = "/auth/v1/admin/audit-events/summary";
const EXPORT_PATH: &str = "/auth/v1/admin/audit-events/export";
const AUDIT_PATHS: [&str; 3] = [LIST_PATH, SUMMARY_PATH, EXPORT_PATH];

async fn get_audit(
    server: &TestServer,
    tenant: &CreatedTenant,
    path_and_query: &str,
) -> TestResult<reqwest::Response> {
    let response = server
        .client
        .get(server.url(path_and_query))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response)
}

async fn get_json(server: &TestServer, tenant: &CreatedTenant, path: &str) -> TestResult<Value> {
    let response = get_audit(server, tenant, path).await?;

    Ok(response.error_for_status()?.json().await?)
}

/// `?from=…&to=…` for the instants `from_hours` and `to_hours` away from one reading of now, so
/// equal hours give equal instants.
fn range_query(from_hours: i64, to_hours: i64) -> TestResult<String> {
    let now = OffsetDateTime::now_utc();
    let from = shift(now, from_hours)?.format(&Rfc3339)?;
    let to = shift(now, to_hours)?.format(&Rfc3339)?;

    Ok(format!("?from={from}&to={to}"))
}

fn shift(instant: OffsetDateTime, hours: i64) -> TestResult<OffsetDateTime> {
    let shifted = instant
        .checked_add(Duration::hours(hours))
        .ok_or("instant out of range")?;

    Ok(shifted)
}

async fn log_in(server: &TestServer, tenant: &CreatedTenant, body: Value) -> TestResult {
    server
        .post_auth("/auth/v1/login", &tenant.publishable_key, body)
        .await?;

    Ok(())
}

#[tokio::test]
async fn reads_only_the_chosen_range() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = format!("range-{}@example.com", tenant.slug);
    server.sign_up(&tenant, &email).await?;
    let wrong_password = encode_hex(&random_bytes::<12>());
    let refused = json!({ "email": email, "password": wrong_password });
    log_in(&server, &tenant, refused).await?;
    let accepted = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
    log_in(&server, &tenant, accepted).await?;

    let around_now = range_query(-1, 1)?;
    let page = get_json(&server, &tenant, &format!("{}{around_now}", LIST_PATH)).await?;
    // The signup, the refused login and the login.
    assert_eq!(field(&page, "/events").as_array().map(Vec::len), Some(3));
    let summary = get_json(&server, &tenant, &format!("{}{around_now}", SUMMARY_PATH)).await?;
    assert_eq!(field(&summary, "/logins"), 1);
    assert_eq!(field(&summary, "/failures"), 1);
    let export = get_audit(&server, &tenant, &format!("{}{around_now}", EXPORT_PATH)).await?;
    let csv = export.error_for_status()?.text().await?;
    assert_eq!(csv.trim_end().split("\r\n").count(), 4, "{csv}");

    let days_ago = range_query(-72, -48)?;
    let empty = get_json(&server, &tenant, &format!("{}{days_ago}", LIST_PATH)).await?;
    assert_eq!(field(&empty, "/events").as_array().map(Vec::len), Some(0));
    let quiet = get_json(&server, &tenant, &format!("{}{days_ago}", SUMMARY_PATH)).await?;
    assert_eq!(field(&quiet, "/logins"), 0);
    assert_eq!(field(&quiet, "/failures"), 0);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn search_merges_matches_without_losing_email_precedence_or_cursor_order() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let session = server.sign_up(&tenant, "current-123@example.com").await?;
    let mut connection = server.tenant_database(&tenant).await?;
    sqlx::query(
        "INSERT INTO auth.audit_events (action, actor, user_id, email, ip_address) VALUES \
         ('login_failed', 'user', $1, 'superseded@example.com', '198.51.100.123'), \
         ('login_failed', 'user', gen_random_uuid(), 'orphan-123@example.com', NULL), \
         ('login_failed', 'user', NULL, NULL, '192.0.2.123')",
    )
    .bind(session.user.id)
    .execute(&mut connection)
    .await?;
    drop(connection);

    let filter = "search=123&kind=failures&days=1";
    let first = get_json(&server, &tenant, &format!("{LIST_PATH}?{filter}&limit=2")).await?;
    assert_eq!(field(&first, "/events/0/ip_address"), "192.0.2.123");
    assert_eq!(field(&first, "/events/1/email"), "orphan-123@example.com");
    let before = field(&first, "/next_before")
        .as_i64()
        .ok_or("missing cursor")?;
    let second = get_json(
        &server,
        &tenant,
        &format!("{LIST_PATH}?{filter}&before={before}"),
    )
    .await?;
    assert_eq!(field(&second, "/events").as_array().map(Vec::len), Some(1));
    assert_eq!(field(&second, "/events/0/email"), "current-123@example.com");

    let obsolete = get_json(&server, &tenant, &format!("{LIST_PATH}?search=superseded")).await?;
    assert_eq!(field(&obsolete, "/events"), &json!([]));
    let export = get_audit(&server, &tenant, &format!("{EXPORT_PATH}?{filter}")).await?;
    let csv = export.error_for_status()?.text().await?;
    assert_eq!(csv.lines().count(), 4);
    assert!(csv.contains("current-123@example.com"));
    assert!(csv.contains("superseded@example.com") == false);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_invalid_ranges() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let valid = range_query(-24, 0)?;
    let from_only = valid
        .split('&')
        .next()
        .ok_or("expected a from parameter")?
        .to_owned();
    let invalid = [
        from_only,
        format!("{valid}&days=7"),
        range_query(0, -24)?,
        range_query(-1, -1)?,
        range_query(-24 * 93, 0)?,
        "?from=yesterday&to=today".to_owned(),
    ];

    for path in AUDIT_PATHS {
        for query in &invalid {
            let response = get_audit(&server, &tenant, &format!("{path}{query}")).await?;
            assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{path}{query}");
        }
    }

    server.drop_tenant(&tenant).await
}
