use reqwest::{Method, StatusCode};
use serde_json::Value;
use sqlx::Connection;
use uuid::Uuid;

use super::receiver::{create_endpoint, webhooks_request};
use crate::support::{TestResult, TestServer, field, unique_email};

const WORKER_HEALTH: &str = "/ops/webhooks/worker-health";
const QUEUE_HEALTH: &str = "/queue-health";

#[tokio::test]
async fn queue_health_counts_due_deliveries_and_terminal_failures() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let (endpoint, _) = create_endpoint(
        &server,
        &tenant,
        ("https://hooks.example.com", &["user.created"]),
    )
    .await?;
    let active_endpoint = Uuid::parse_str(&endpoint)?;
    let absent_endpoint = Uuid::new_v4();
    let mut database = server.tenant_database(&tenant).await?;
    sqlx::query(
        "SELECT pg_advisory_lock(hashtextextended('webhook_endpoint:' || $1::uuid::text, 0))",
    )
    .bind(active_endpoint)
    .execute(&mut database)
    .await?;
    sqlx::query(
        "WITH event AS (INSERT INTO webhook_events (id, event_type, payload) VALUES \
         (gen_random_uuid(), 'user.created', '{\"private\":true}') RETURNING id) \
         INSERT INTO webhook_deliveries (id, event_id, endpoint_id, next_attempt_at, lease_token, lease_expires_at, failed_at, last_error) \
         SELECT gen_random_uuid(), event.id, fixtures.endpoint_id, now() + due, token, now() + expiry, now() + failed, error \
         FROM event CROSS JOIN (VALUES \
         ($1::uuid, '-125 seconds'::interval, NULL::uuid, NULL::interval, NULL::interval, NULL::text), \
         ($1, '-10 seconds', gen_random_uuid(), '-1 second', NULL, NULL), \
         ($1, '-200 seconds', gen_random_uuid(), '30 minutes', NULL, NULL), \
         ($1, '1 hour', NULL, NULL, NULL, NULL), \
         ($2, '-300 seconds', gen_random_uuid(), '30 minutes', NULL, NULL), \
         ($1, '0', NULL, NULL, '-1 hour', 'HTTP 500'), \
         ($1, '0', NULL, NULL, '-25 hours', 'HTTP 500'), \
         ($2, '0', NULL, NULL, '-1 hour', 'the endpoint was deleted or disabled') \
         ) AS fixtures(endpoint_id, due, token, expiry, failed, error)",
    )
    .bind(active_endpoint).bind(absent_endpoint).execute(&mut database).await?;

    let response = webhooks_request(&server, &tenant, (Method::GET, QUEUE_HEALTH))
        .send()
        .await?
        .error_for_status()?;
    assert_eq!(
        response
            .headers()
            .get("cache-control")
            .and_then(|value| value.to_str().ok()),
        Some("no-store")
    );
    let health: Value = response.json().await?;
    assert_eq!(field(&health, "/active_endpoints"), 1);
    assert_eq!(field(&health, "/pending/value"), 5);
    assert_eq!(field(&health, "/overdue/value"), 2);
    assert_eq!(field(&health, "/failed_last_day/value"), 1);
    assert!(
        field(&health, "/oldest_overdue_seconds")
            .as_i64()
            .unwrap_or_default()
            >= 125
    );
    assert!(health.get("payload").is_none());
    assert!(health.get("lease_token").is_none());

    let other = server.create_tenant().await?;
    let separate: Value = webhooks_request(&server, &other, (Method::GET, QUEUE_HEALTH))
        .header("x-nelcota-project", tenant.tenant_id.to_string())
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&separate, "/pending/value"), 0);
    database.close().await?;
    server.drop_tenant(&other).await?;
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn queue_health_refuses_public_keys_and_unrelated_console_accounts() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let path = server.url("/auth/v1/admin/webhooks/queue-health");
    let public = server
        .client
        .get(&path)
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(public.status(), StatusCode::FORBIDDEN);

    let (platform, account) = server
        .create_platform_account(&unique_email("queue-isolation"))
        .await?;
    let outsider = server
        .client
        .get(path)
        .header("x-nelcota-project", tenant.tenant_id.to_string())
        .bearer_auth(account.access_token)
        .send()
        .await?;
    assert_eq!(outsider.status(), StatusCode::FORBIDDEN);

    server.drop_tenant(&platform).await?;
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn a_blocked_queue_read_returns_unavailable() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let initial = webhooks_request(&server, &tenant, (Method::GET, QUEUE_HEALTH))
        .send()
        .await?;
    assert_eq!(initial.status(), StatusCode::OK);
    let mut database = server.tenant_database(&tenant).await?;
    let mut transaction = database.begin().await?;
    sqlx::query("LOCK TABLE webhook_deliveries IN ACCESS EXCLUSIVE MODE")
        .execute(&mut *transaction)
        .await?;
    let blocked = webhooks_request(&server, &tenant, (Method::GET, QUEUE_HEALTH))
        .send()
        .await?;
    transaction.rollback().await?;

    assert_eq!(blocked.status(), StatusCode::SERVICE_UNAVAILABLE);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn worker_health_requires_the_platform_admin_token() -> TestResult {
    let server = TestServer::start().await?;
    let url = server.url(WORKER_HEALTH);
    let missing = server.client.get(&url).send().await?;
    assert_eq!(missing.status(), StatusCode::UNAUTHORIZED);
    let permitted: Value = server
        .client
        .get(url)
        .header("x-admin-token", server.admin_token())
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(field(&permitted, "/expected_replicas"), 2);
    assert!(permitted.get("last_seen_at").is_some());
    assert!(permitted.get("replica_id").is_none());

    Ok(())
}
