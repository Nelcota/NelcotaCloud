use std::time::Duration;

use reqwest::StatusCode;
use server::modules::tenants::provisioning::tenant_deletion::stage_deletion;
use sqlx::Connection;
use uuid::Uuid;

use crate::support::{CreatedTenant, TestResult, TestServer, random_slug};

#[tokio::test]
async fn a_committed_deletion_reserves_its_slug_and_retires_cached_keys() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    assert_eq!(captcha(&server, &tenant).await?, StatusCode::OK);

    let mut connection = server.control_plane().await?;
    let mut transaction = connection.begin().await?;
    assert!(stage_deletion(&mut transaction, tenant.tenant_id, None).await?);
    sqlx::query(
        "UPDATE pending_tenant_deletions SET next_attempt_at = now() + interval '1 hour' WHERE tenant_id = $1",
    )
    .bind(tenant.tenant_id)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    assert!(server.tenant_database_exists(&tenant.slug).await?);
    assert_eq!(captcha(&server, &tenant).await?, StatusCode::UNAUTHORIZED);
    let blocked = server
        .request_tenant(&tenant.slug, Some(server.admin_token()))
        .await?;
    assert_eq!(blocked.status(), StatusCode::CONFLICT);

    // Simulate a prior process completing the physical drop and dying before finalizing.
    server.drop_tenant(&tenant).await?;
    let resumed = server
        .client
        .delete(server.url(&format!("/admin/v1/tenants/{}", tenant.tenant_id)))
        .header("x-admin-token", server.admin_token())
        .send()
        .await?;
    assert_eq!(resumed.status(), StatusCode::NO_CONTENT);

    let replacement = server.create_tenant_with_slug(&tenant.slug).await?;
    assert_ne!(replacement.tenant_id, tenant.tenant_id);
    server.drop_tenant(&replacement).await
}

#[tokio::test]
async fn maintenance_reclaims_a_database_from_interrupted_provisioning() -> TestResult {
    let server = TestServer::start().await?;
    let slug = random_slug();
    server.create_orphan_database(&slug).await?;
    let mut control = server.control_plane().await?;
    sqlx::query(
        "INSERT INTO tenant_provisioning_intents (slug, tenant_id, recover_after)
         VALUES ($1, $2, clock_timestamp())",
    )
    .bind(&slug)
    .bind(Uuid::new_v4())
    .execute(&mut control)
    .await?;

    for _ in 0..110 {
        let pending: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM tenant_provisioning_intents WHERE slug = $1)",
        )
        .bind(&slug)
        .fetch_one(&mut control)
        .await?;
        if pending == false {
            assert!(server.tenant_database_exists(&slug).await? == false);
            let tenant = server.create_tenant_with_slug(&slug).await?;
            return server.drop_tenant(&tenant).await;
        }

        tokio::time::sleep(Duration::from_millis(200)).await;
    }

    Err("maintenance did not reclaim the provisioning intent".into())
}

#[tokio::test]
async fn maintenance_finishes_a_committed_deletion_without_an_http_retry() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let mut control_plane = server.control_plane().await?;
    let mut transaction = control_plane.begin().await?;
    assert!(stage_deletion(&mut transaction, tenant.tenant_id, None).await?);
    transaction.commit().await?;

    for _ in 0..100 {
        let is_pending: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM pending_tenant_deletions WHERE tenant_id = $1)",
        )
        .bind(tenant.tenant_id)
        .fetch_one(&mut control_plane)
        .await?;
        if is_pending == false {
            assert!(server.tenant_database_exists(&tenant.slug).await? == false);
            return Ok(());
        }

        tokio::time::sleep(Duration::from_millis(200)).await;
    }

    Err("maintenance did not finish the staged deletion".into())
}

async fn captcha(server: &TestServer, tenant: &CreatedTenant) -> TestResult<StatusCode> {
    let response = server
        .client
        .get(server.url("/auth/v1/captcha"))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;

    Ok(response.status())
}
