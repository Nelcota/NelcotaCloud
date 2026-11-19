use reqwest::{Response, StatusCode};
use serde_json::Value;
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

/// Walks every page of the last-login order one user at a time, returning the emails in order.
async fn emails_by_last_login(
    server: &TestServer,
    tenant: &CreatedTenant,
) -> TestResult<Vec<String>> {
    let mut emails = Vec::new();
    let mut cursor: Option<String> = None;

    loop {
        let mut query = vec![("order", "last_sign_in"), ("limit", "1")];
        let before = cursor.clone().unwrap_or_default();

        if cursor.is_some() {
            query.push(("before", before.as_str()));
        }

        let page: Value = users_page(server, tenant, &query)
            .await?
            .error_for_status()?
            .json()
            .await?;
        let email = field(&page, "/users/0/email")
            .as_str()
            .ok_or("expected a user")?;
        emails.push(email.to_owned());
        let next = field(&page, "/next_cursor").as_str().map(str::to_owned);

        if next.is_none() {
            return Ok(emails);
        }

        cursor = next;
    }
}

#[tokio::test]
async fn orders_by_last_login_with_users_who_never_logged_in_last() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut database = server.tenant_database(&tenant).await?;
    sqlx::query(
        "INSERT INTO users (id, email, created_at, last_sign_in_at) VALUES \
         ($1, 'old-login@example.com', now(), now() - interval '2 hours'), \
         ($2, 'recent-login@example.com', now(), now() - interval '1 hour'), \
         ($3, 'never-a@example.com', now(), NULL), \
         ($4, 'never-b@example.com', now(), NULL)",
    )
    .bind(Uuid::from_u128(1))
    .bind(Uuid::from_u128(2))
    .bind(Uuid::from_u128(3))
    .bind(Uuid::from_u128(4))
    .execute(&mut database)
    .await?;

    let emails = emails_by_last_login(&server, &tenant).await?;
    assert_eq!(
        emails,
        [
            "recent-login@example.com",
            "old-login@example.com",
            "never-b@example.com",
            "never-a@example.com",
        ]
    );

    let created_order: Value = users_page(&server, &tenant, &[("limit", "1")])
        .await?
        .error_for_status()?
        .json()
        .await?;
    let created_cursor = field(&created_order, "/next_cursor")
        .as_str()
        .ok_or("expected a creation cursor")?;
    let mixed = [("order", "last_sign_in"), ("before", created_cursor)];
    let refused = users_page(&server, &tenant, &mixed).await?;
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);

    let unknown = users_page(&server, &tenant, &[("order", "email")]).await?;
    assert_eq!(unknown.status(), StatusCode::BAD_REQUEST);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn new_logins_update_the_last_login_and_rotations_do_not() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut database = server.tenant_database(&tenant).await?;
    let user_id = Uuid::from_u128(10);
    sqlx::query("INSERT INTO users (id, email) VALUES ($1, 'ana@example.com')")
        .bind(user_id)
        .execute(&mut database)
        .await?;

    for (token, started) in [
        (1_u128, "2026-03-01T10:00:00Z"),
        (2, "2026-01-01T10:00:00Z"),
    ] {
        sqlx::query(
            "INSERT INTO refresh_tokens \
             (id, user_id, family_id, token_hash, expires_at, family_started_at) \
             VALUES ($1, $2, $1, $3, now() + interval '1 day', $4::timestamptz)",
        )
        .bind(Uuid::from_u128(token))
        .bind(user_id)
        .bind(token.to_be_bytes().to_vec())
        .bind(started)
        .execute(&mut database)
        .await?;
    }

    let page: Value = users_page(&server, &tenant, &[])
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(
        field(&page, "/users/0/last_sign_in_at"),
        "2026-03-01T10:00:00Z"
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn lists_how_each_user_logs_in() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut database = server.tenant_database(&tenant).await?;
    let user_id = Uuid::from_u128(20);
    sqlx::query("INSERT INTO users (id, email, password_hash) VALUES ($1, 'bia@example.com', 'x')")
        .bind(user_id)
        .execute(&mut database)
        .await?;
    sqlx::query(
        "INSERT INTO identities (id, user_id, provider, provider_user_id) VALUES \
         ($1, $3, 'google', 'g-1'), ($2, $3, 'github', 'h-1')",
    )
    .bind(Uuid::from_u128(21))
    .bind(Uuid::from_u128(22))
    .bind(user_id)
    .execute(&mut database)
    .await?;

    let page: Value = users_page(&server, &tenant, &[])
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&page, "/users/0/has_password"), true);
    assert_eq!(
        field(&page, "/users/0/providers"),
        &serde_json::json!(["github", "google"])
    );
    assert_eq!(field(&page, "/users/0/last_sign_in_at"), &Value::Null);
    server.drop_tenant(&tenant).await
}
