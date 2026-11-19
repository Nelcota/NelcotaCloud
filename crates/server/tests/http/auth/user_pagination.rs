use reqwest::{Response, StatusCode};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::support::{CreatedTenant, TestResult, TestServer, field};

const PAGE_PATH: &str = "/auth/v1/admin/users/page";

async fn users_page(
    server: &TestServer,
    tenant: &CreatedTenant,
    query: &[(&str, &str)],
) -> TestResult<Response> {
    Ok(server
        .client
        .get(server.url(PAGE_PATH))
        .header("apikey", &tenant.secret_key)
        .query(query)
        .send()
        .await?)
}

#[tokio::test]
async fn continues_through_users_with_equal_creation_times() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut database = server.tenant_database(&tenant).await?;
    sqlx::query(
        "INSERT INTO users (id, email, created_at, banned_at) \
         VALUES ($1, 'alpha@example.com', now(), now()), \
                ($2, 'beta@example.com', now(), now()), \
                ($3, 'gamma@example.com', now(), NULL)",
    )
    .bind(Uuid::from_u128(1))
    .bind(Uuid::from_u128(2))
    .bind(Uuid::from_u128(3))
    .execute(&mut database)
    .await?;

    let filters = [("status", "banned"), ("email", "AMPLE"), ("limit", "1")];
    let first: Value = users_page(&server, &tenant, &filters)
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&first, "/users/0/email"), "beta@example.com");
    assert!(first.get("total").is_none());
    let next = field(&first, "/next_cursor")
        .as_str()
        .ok_or("expected continuation")?;
    let second = [filters.as_slice(), &[("before", next)]].concat();
    let last: Value = users_page(&server, &tenant, &second)
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&last, "/users/0/email"), "alpha@example.com");
    assert_eq!(field(&last, "/next_cursor"), &Value::Null);

    let empty_query = [("email", "unmatched")];
    let empty: Value = users_page(&server, &tenant, &empty_query)
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(empty, json!({"users": [], "next_cursor": null}));
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn validates_cursor_queries_and_requires_admin_access() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    for (name, value) in [
        ("before", "bad"),
        ("limit", "0"),
        ("email", " "),
        ("status", "deleted"),
    ] {
        let response = users_page(&server, &tenant, &[(name, value)]).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    let denied = server
        .client
        .get(server.url(PAGE_PATH))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
