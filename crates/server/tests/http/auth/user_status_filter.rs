use reqwest::{Response, StatusCode};
use serde_json::Value;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};

const USERS_PATH: &str = "/auth/v1/admin/users";

async fn admin_get(
    server: &TestServer,
    tenant: &CreatedTenant,
    path: &str,
) -> TestResult<Response> {
    let response = server
        .client
        .get(server.url(path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response)
}

async fn mark_verified(database: &mut PgConnection, user_id: Uuid) -> TestResult {
    sqlx::query("UPDATE users SET email_verified_at = now() WHERE id = $1")
        .bind(user_id)
        .execute(database)
        .await?;

    Ok(())
}

async fn listed_emails(
    server: &TestServer,
    tenant: &CreatedTenant,
    query: &str,
) -> TestResult<Vec<String>> {
    let path = format!("{USERS_PATH}{query}");
    let page: Value = admin_get(server, tenant, &path).await?.json().await?;
    let users = field(&page, "/users")
        .as_array()
        .ok_or("the page has no users array")?;

    Ok(users
        .iter()
        .filter_map(|user| user["email"].as_str().map(str::to_owned))
        .collect())
}

#[tokio::test]
async fn filters_users_by_status() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let unverified = unique_email("unverified");
    let verified = server.sign_up(&tenant, &unique_email("verified")).await?;
    let banned = server.sign_up(&tenant, &unique_email("banned")).await?;
    server.sign_up(&tenant, &unverified).await?;
    let mut database = server.tenant_database(&tenant).await?;
    mark_verified(&mut database, verified.user.id).await?;
    mark_verified(&mut database, banned.user.id).await?;
    server
        .ban_without_ending_sessions(&tenant, banned.user.id)
        .await?;

    let unverified_only = listed_emails(&server, &tenant, "?status=unverified").await?;
    assert_eq!(unverified_only, vec![unverified.clone()]);
    let banned_only = listed_emails(&server, &tenant, "?status=banned").await?;
    assert_eq!(banned_only, vec![banned.user.email.clone()]);
    let searched = listed_emails(&server, &tenant, "?status=banned&email=unverified").await?;
    assert!(searched.is_empty());
    assert_eq!(listed_emails(&server, &tenant, "").await?.len(), 3);

    let unknown = admin_get(&server, &tenant, &format!("{USERS_PATH}?status=deleted")).await?;
    assert_eq!(unknown.status(), StatusCode::BAD_REQUEST);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn zero_limit_returns_the_count_without_user_records() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    server.sign_up(&tenant, &unique_email("count")).await?;

    for (query, total) in [("?limit=0", 1), ("?limit=0&email=absent", 0)] {
        let path = format!("{USERS_PATH}{query}");
        let response = admin_get(&server, &tenant, &path)
            .await?
            .error_for_status()?;
        let page: Value = response.json().await?;
        assert_eq!(field(&page, "/users"), &serde_json::json!([]));
        assert_eq!(field(&page, "/total"), total);
    }

    server.drop_tenant(&tenant).await
}
