use reqwest::StatusCode;
use serde_json::Value;
use uuid::Uuid;

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};

const USAGE_PATH: &str = "/auth/v1/admin/usage";

async fn usage(server: &TestServer, tenant: &CreatedTenant, cached: bool) -> TestResult<Value> {
    let response = server
        .client
        .get(server.url(USAGE_PATH))
        .query(&[("cached", cached)])
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

#[tokio::test]
async fn counts_each_user_active_in_a_month_once() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    assert_eq!(
        field(
            &usage(&server, &tenant, true).await?,
            "/active_users_this_month"
        ),
        0
    );

    let first = server.sign_up(&tenant, &unique_email("usage")).await?;
    server.sign_up(&tenant, &unique_email("usage")).await?;
    let refreshed = server.refresh(&tenant, &first.refresh_token).await?;
    assert_eq!(refreshed.status(), StatusCode::OK);
    let returning = server.sign_up(&tenant, &unique_email("usage")).await?;
    let mut database = server.tenant_database(&tenant).await?;
    // A session renewed last month, by a user who is also active this month.
    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, now() + interval '1 day', date_trunc('month', now(), 'UTC') - interval '1 day')",
    )
    .bind(Uuid::new_v4())
    .bind(returning.user.id)
    .bind(Uuid::new_v4())
    .bind(Uuid::new_v4().as_bytes().as_slice())
    .execute(&mut database)
    .await?;

    let counted = usage(&server, &tenant, false).await?;
    assert_eq!(field(&counted, "/active_users_this_month"), 3);
    assert_eq!(field(&counted, "/active_users_last_month"), 1);
    assert!(field(&counted, "/month_start").is_string());
    let cached = usage(&server, &tenant, true).await?;
    assert_eq!(field(&cached, "/active_users_this_month"), 0);

    let publishable = server
        .client
        .get(server.url(USAGE_PATH))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
