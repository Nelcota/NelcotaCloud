use reqwest::{Method, StatusCode};
use serde_json::json;
use server::modules::webhooks::scheduling::webhook_schedule_repository::{DueTenant, reschedule};
use sqlx::{AssertSqlSafe, Connection};

use super::receiver::{create_endpoint, send, webhooks_request};
use crate::support::{TestResult, TestServer};

#[tokio::test]
async fn an_endpoint_mutation_rolls_back_when_its_schedule_write_fails() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let endpoint = ("https://hooks.example.com", &["user.created"][..]);
    let (id, _) = create_endpoint(&server, &tenant, endpoint).await?;
    let mut control_plane = server.control_plane().await?;
    let tenant_id = tenant.tenant_id;
    let constraint = format!("fixture_schedule_{}", tenant_id.simple());
    let reject = format!(
        "ALTER TABLE webhook_schedule ADD CONSTRAINT {constraint} CHECK (tenant_id <> '{tenant_id}') NOT VALID"
    );
    sqlx::raw_sql(AssertSqlSafe(reject))
        .execute(&mut control_plane)
        .await?;

    let path = format!("/{id}");
    let disabled = send(
        webhooks_request(&server, &tenant, (Method::PATCH, &path))
            .json(&json!({ "is_enabled": false })),
    )
    .await?;
    let deleted = send(webhooks_request(&server, &tenant, (Method::DELETE, &path))).await?;
    let statement = format!("ALTER TABLE webhook_schedule DROP CONSTRAINT {constraint}");
    sqlx::raw_sql(AssertSqlSafe(statement))
        .execute(&mut control_plane)
        .await?;

    assert_eq!(disabled.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(deleted.status(), StatusCode::INTERNAL_SERVER_ERROR);
    let remains_enabled: bool =
        sqlx::query_scalar("SELECT is_enabled FROM webhook_endpoints WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_one(&mut control_plane)
            .await?;
    assert!(remains_enabled);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn a_hint_committed_during_a_run_survives_rescheduling() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut writer = server.control_plane().await?;
    let mut worker = server.control_plane().await?;
    let tenant_id = tenant.tenant_id;
    let original_due = sqlx::query_scalar(
        "INSERT INTO webhook_schedule (tenant_id, next_due_at) VALUES ($1, now() + interval '1 hour') RETURNING next_due_at",
    )
    .bind(tenant_id)
    .fetch_one(&mut writer)
    .await?;
    let mut transaction = writer.begin().await?;
    sqlx::query("UPDATE webhook_schedule SET next_due_at = next_due_at + interval '1 hour' WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(&mut *transaction)
        .await?;
    let checked_at = sqlx::query_scalar("SELECT clock_timestamp() + interval '3 hours'")
        .fetch_one(&mut worker)
        .await?;
    let seen = DueTenant {
        tenant_id,
        checked_at,
        next_due_at: original_due,
    };
    transaction.commit().await?;

    reschedule(&mut worker, &seen, None).await?;
    let new_due: time::OffsetDateTime =
        sqlx::query_scalar("SELECT next_due_at FROM webhook_schedule WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_one(&mut worker)
            .await?;
    assert!(original_due < new_due);
    assert!(new_due <= checked_at);

    server.drop_tenant(&tenant).await
}
