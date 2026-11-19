use std::time::Duration;

use server::modules::webhooks::delivery::delivery_claim_repository::claim_due_deliveries;
use server::modules::webhooks::delivery::delivery_log_repository::{Requeue, requeue_delivery};
use server::modules::webhooks::delivery::delivery_queue_repository::{
    AttemptResult, abandon_orphaned_deliveries, mark_delivered, mark_failed, next_due_at,
};
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::support::{TestResult, TestServer};

#[tokio::test]
async fn concurrent_claims_reserve_one_delivery_per_endpoint() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let pool = server.tenant_fixture_pool(&tenant).await?;
    let primary = Uuid::new_v4();
    let other = Uuid::new_v4();
    let earliest = enqueue(&pool, primary).await?;
    enqueue(&pool, primary).await?;
    enqueue(&pool, other).await?;
    let primary_endpoint = [primary];
    let both_endpoints = [primary, other];

    let (primary_claim, concurrent_claim) = tokio::try_join!(
        claim_due_deliveries(&pool, &primary_endpoint),
        claim_due_deliveries(&pool, &both_endpoints),
    )?;
    let claims: Vec<_> = primary_claim.into_iter().chain(concurrent_claim).collect();
    assert_eq!(claims.len(), 2);
    assert!(
        claims
            .iter()
            .any(|claim| claim.lease.delivery_id == earliest)
    );
    assert!(claims.iter().any(|claim| claim.endpoint_id == other));
    assert!(
        claim_due_deliveries(&pool, &[primary, other])
            .await?
            .is_empty()
    );

    let earliest_expiry: OffsetDateTime =
        sqlx::query_scalar("SELECT min(lease_expires_at) FROM webhook_deliveries")
            .fetch_one(&pool)
            .await?;
    assert_eq!(next_due_at(&pool).await?, Some(earliest_expiry));

    pool.close().await;
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn a_reclaimed_delivery_rejects_completion_from_the_previous_owner() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let pool = server.tenant_fixture_pool(&tenant).await?;
    let endpoint_id = Uuid::new_v4();
    let delivery_id = enqueue(&pool, endpoint_id).await?;
    let claims = claim_due_deliveries(&pool, &[endpoint_id]).await?;
    let previous = claims.first().ok_or("expected an original claim")?;

    assert_eq!(
        requeue_delivery(&pool, endpoint_id, delivery_id).await?,
        Requeue::InProgress
    );
    expire_lease(&pool, delivery_id).await?;
    assert!(mark_delivered(&pool, previous.lease, 200).await? == false);
    let recovered = claim_due_deliveries(&pool, &[endpoint_id]).await?;
    let current = recovered.first().ok_or("expected a recovered claim")?;
    assert_eq!(current.event_id, previous.event_id);
    assert_eq!(current.lease.delivery_id, previous.lease.delivery_id);
    assert_ne!(current.lease.token, previous.lease.token);

    let stale_failure = AttemptResult {
        lease: previous.lease,
        status: Some(500),
        error: Some("fixture"),
    };
    assert!(mark_failed(&pool, stale_failure, Some(Duration::from_secs(1))).await? == false);
    assert!(mark_delivered(&pool, current.lease, 204).await?);
    assert!(mark_delivered(&pool, current.lease, 200).await? == false);

    let result: (i32, i32) = sqlx::query_as(
        "SELECT attempts, last_response_status FROM webhook_deliveries WHERE id = $1",
    )
    .bind(delivery_id)
    .fetch_one(&pool)
    .await?;
    assert_eq!(result, (1, 204));

    pool.close().await;
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn an_orphaned_delivery_is_abandoned_after_its_lease_expires() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let pool = server.tenant_fixture_pool(&tenant).await?;
    let endpoint_id = Uuid::new_v4();
    let delivery_id = enqueue(&pool, endpoint_id).await?;
    claim_due_deliveries(&pool, &[endpoint_id]).await?;
    let cutoff = sqlx::query_scalar("SELECT clock_timestamp()")
        .fetch_one(&pool)
        .await?;

    assert_eq!(abandon_orphaned_deliveries(&pool, &[], cutoff).await?, 0);
    expire_lease(&pool, delivery_id).await?;
    assert_eq!(abandon_orphaned_deliveries(&pool, &[], cutoff).await?, 1);

    pool.close().await;
    server.drop_tenant(&tenant).await
}

async fn enqueue(pool: &PgPool, endpoint_id: Uuid) -> TestResult<Uuid> {
    let id = sqlx::query_scalar(
        "WITH event AS (INSERT INTO webhook_events (id, event_type, payload) \
         VALUES (gen_random_uuid(), 'user.created', '{}') RETURNING id) \
         INSERT INTO webhook_deliveries (id, event_id, endpoint_id) \
         SELECT gen_random_uuid(), id, $1 FROM event RETURNING id",
    )
    .bind(endpoint_id)
    .fetch_one(pool)
    .await?;

    Ok(id)
}

async fn expire_lease(pool: &PgPool, delivery_id: Uuid) -> TestResult {
    sqlx::query("UPDATE webhook_deliveries SET lease_expires_at = now() - interval '1 second' WHERE id = $1")
        .bind(delivery_id)
        .execute(pool)
        .await?;

    Ok(())
}
