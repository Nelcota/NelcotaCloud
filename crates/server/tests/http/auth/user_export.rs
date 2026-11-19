use reqwest::StatusCode;
use reqwest::header::CONTENT_TYPE;
use uuid::Uuid;

use crate::support::{TestResult, TestServer};

const EXPORT_PATH: &str = "/auth/v1/admin/users/export";

#[tokio::test]
async fn exports_the_filtered_users_as_csv_for_admins_only() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut database = server.tenant_database(&tenant).await?;
    sqlx::query(
        "INSERT INTO users (id, email, banned_at, user_metadata) VALUES \
         ($1, 'blocked@example.com', now(), '{\"name\": \"=cmd\"}'), \
         ($2, 'fine@example.com', NULL, '{}')",
    )
    .bind(Uuid::from_u128(1))
    .bind(Uuid::from_u128(2))
    .execute(&mut database)
    .await?;

    let response = server
        .client
        .get(server.url(EXPORT_PATH))
        .header("apikey", &tenant.secret_key)
        .query(&[("status", "banned")])
        .send()
        .await?
        .error_for_status()?;
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_owned();
    let body = response.text().await?;
    let lines: Vec<&str> = body.trim_start_matches('\u{feff}').lines().collect();

    assert!(content_type.starts_with("text/csv"), "{content_type}");
    assert_eq!(lines.len(), 2, "{body}");
    assert!(
        lines
            .iter()
            .any(|line| line.contains("blocked@example.com,'=cmd,banned"))
    );
    assert!(body.contains("fine@example.com") == false);

    let invalid = server
        .client
        .get(server.url(EXPORT_PATH))
        .header("apikey", &tenant.secret_key)
        .query(&[("order", "email")])
        .send()
        .await?;
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);

    let denied = server
        .client
        .get(server.url(EXPORT_PATH))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
