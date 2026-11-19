use reqwest::StatusCode;
use serde_json::Value;
use sqlx::PgConnection;

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};

const DAILY_USAGE_PATH: &str = "/auth/v1/admin/usage/daily";

async fn daily_usage(
    server: &TestServer,
    tenant: &CreatedTenant,
    query: &str,
) -> TestResult<reqwest::Response> {
    let response = server
        .client
        .get(server.url(&format!("{DAILY_USAGE_PATH}{query}")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response)
}

/// Inserts a login event `days_ago` UTC days back, at noon so it never straddles midnight.
async fn insert_login(database: &mut PgConnection, days_ago: i32) -> TestResult {
    sqlx::query(
        "INSERT INTO audit_events (action, actor, occurred_at) VALUES ('logged_in', 'user', (((now() AT TIME ZONE 'UTC')::date - $1)::timestamp + interval '12 hours') AT TIME ZONE 'UTC')",
    )
    .bind(days_ago)
    .execute(database)
    .await?;

    Ok(())
}

#[tokio::test]
async fn counts_logins_and_sign_ups_per_utc_day() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    server.sign_up(&tenant, &unique_email("daily")).await?;
    server.sign_up(&tenant, &unique_email("daily")).await?;
    let mut database = server.tenant_database(&tenant).await?;
    insert_login(&mut database, 0).await?;
    insert_login(&mut database, 2).await?;
    insert_login(&mut database, 2).await?;
    // Outside a 7-day window, and a failed attempt that is not a login.
    insert_login(&mut database, 7).await?;
    sqlx::query("INSERT INTO audit_events (action, actor) VALUES ('login_failed', 'user')")
        .execute(&mut database)
        .await?;

    let usage: Value = daily_usage(&server, &tenant, "?days=7")
        .await?
        .error_for_status()?
        .json()
        .await?;
    let days = field(&usage, "/days")
        .as_array()
        .ok_or("days is not an array")?;
    assert_eq!(days.len(), 7);
    let today = days.last().ok_or("no days")?;
    assert_eq!(field(today, "/logins"), 1);
    assert_eq!(field(today, "/sign_ups"), 2);
    let two_days_ago = days.get(4).ok_or("no day at index 4")?;
    assert_eq!(field(two_days_ago, "/logins"), 2);
    assert_eq!(field(two_days_ago, "/sign_ups"), 0);
    let first = days.first().ok_or("no days")?;
    assert_eq!(field(first, "/logins"), 0);
    assert!(
        field(first, "/date")
            .as_str()
            .is_some_and(|date| date.len() == 10)
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn defaults_to_thirty_days() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let usage: Value = daily_usage(&server, &tenant, "")
        .await?
        .error_for_status()?
        .json()
        .await?;
    let days = field(&usage, "/days")
        .as_array()
        .ok_or("days is not an array")?;
    assert_eq!(days.len(), 30);
    assert!(days.iter().all(|day| field(day, "/logins") == 0));
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_invalid_windows_and_publishable_keys() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    for query in ["?days=0", "?days=91", "?days=-1", "?days=week"] {
        let response = daily_usage(&server, &tenant, query).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{query}");
    }

    let publishable = server
        .client
        .get(server.url(DAILY_USAGE_PATH))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
