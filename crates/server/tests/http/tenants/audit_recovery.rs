use reqwest::StatusCode;
use serde_json::json;
use sqlx::Connection;
use uuid::Uuid;

use server::modules::tenants::audit::project_audit_queue::recover_project_changes;
use server::modules::tenants::postgres::tenant_database_server::ensure_database_identity;
use server::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;

use crate::support::{TestResult, TestServer};

#[tokio::test]
async fn configuration_audit_survives_an_unavailable_audit_table() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut database = server.tenant_database(&tenant).await?;
    let mut unavailable = database.begin().await?;
    sqlx::query("LOCK TABLE auth.audit_events IN ACCESS EXCLUSIVE MODE")
        .execute(&mut *unavailable)
        .await?;
    let response = server
        .client
        .patch(server.url("/auth/v1/admin/settings"))
        .header("apikey", &tenant.secret_key)
        .json(&json!({ "name": "Recovered project" }))
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    let mut control = server.control_plane().await?;
    let event: Uuid = sqlx::query_scalar(
        "SELECT id FROM project_audit_queue WHERE tenant_id = $1 AND action = 'settings_changed'",
    )
    .bind(tenant.tenant_id)
    .fetch_one(&mut control)
    .await?;
    unavailable.rollback().await?;
    sqlx::query("UPDATE project_audit_queue SET next_attempt_at = now() WHERE id = $1")
        .bind(event)
        .execute(&mut control)
        .await?;

    let pool = sqlx::PgPool::connect(&std::env::var("CONTROL_PLANE_DATABASE_URL")?).await?;
    let registry =
        TenantPoolRegistry::new(pool.clone(), server.tenant_database_base_url().to_owned());
    recover_project_changes(&pool, &registry).await?;
    let recovered: i64 =
        sqlx::query_scalar("SELECT count(*) FROM audit_events WHERE source_id = $1")
            .bind(event)
            .fetch_one(&mut database)
            .await?;
    assert_eq!(recovered, 1);

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn provisioned_database_confirms_its_project_identity() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut database = server.tenant_database(&tenant).await?;
    ensure_database_identity(&mut database, tenant.tenant_id).await?;
    assert!(
        ensure_database_identity(&mut database, Uuid::new_v4())
            .await
            .is_err()
    );

    server.drop_tenant(&tenant).await
}
