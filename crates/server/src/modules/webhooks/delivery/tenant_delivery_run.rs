use std::sync::Arc;

use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::tenants::database::tenant_pool_registry::{
    TenantPoolError, TenantPoolRegistry,
};
use crate::modules::webhooks::delivery::delivery_queue_repository::{
    AttemptResult, abandon_orphaned_deliveries, claim_due_deliveries, delete_expired_events,
    mark_delivered, mark_failed, next_due_at,
};
use crate::modules::webhooks::delivery::delivery_targets::{
    DeliveryTargets, DeliveryTargetsError, load_delivery_targets,
};
use crate::modules::webhooks::delivery::endpoint_batch::{AttemptReport, send_claimed};
use crate::modules::webhooks::delivery::retry_schedule::retry_delay;
use crate::modules::webhooks::delivery::webhook_request::DeliveryOutcome;
use crate::modules::webhooks::delivery::webhook_schedule_repository::{DueTenant, reschedule};
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::shared::crypto::secret_box::SecretBox;

/// Small batches keep each transaction (and its row locks) short: at most this many requests,
/// each bounded by the request timeout.
const BATCH_SIZE: i64 = 10;
/// Batches per tenant before the worker moves on, so one busy tenant cannot starve the others.
const MAX_BATCHES_PER_RUN: usize = 20;

#[derive(Debug, thiserror::Error)]
pub enum DeliveryRunError {
    #[error("could not open the tenant database: {0}")]
    TenantPool(#[from] Arc<TenantPoolError>),
    #[error(transparent)]
    Targets(#[from] DeliveryTargetsError),
    #[error("database error while delivering webhooks: {0}")]
    Database(#[from] sqlx::Error),
}

/// Everything the worker needs to deliver any tenant's webhooks.
pub struct DeliveryContext {
    pub control_plane_pool: PgPool,
    pub tenant_pools: Arc<TenantPoolRegistry>,
    pub secret_box: Arc<SecretBox>,
    pub transport: WebhookTransport,
}

/// Delivers what is due for one tenant, then schedules its next run.
pub async fn deliver_tenant(
    context: &DeliveryContext,
    due: &DueTenant,
) -> Result<(), DeliveryRunError> {
    let tenant_id = due.tenant_id;
    let pool = context.tenant_pools.pool_for(tenant_id).await?;
    let control_plane_pool = &context.control_plane_pool;
    // Read on the tenant's clock before the targets, so deliveries recorded afterwards (maybe for
    // an endpoint created meanwhile) are never given up as orphans by this run.
    let targets_loaded_at: OffsetDateTime =
        sqlx::query_scalar("SELECT now()").fetch_one(&pool).await?;
    let targets = load_delivery_targets(control_plane_pool, &context.secret_box, tenant_id).await?;
    let enabled_endpoint_ids: Vec<Uuid> = targets.keys().copied().collect();
    abandon_orphaned_deliveries(&pool, &enabled_endpoint_ids, targets_loaded_at).await?;

    for _ in 0..MAX_BATCHES_PER_RUN {
        if deliver_batch(context, &pool, &targets).await? == 0 {
            break;
        }
    }

    delete_expired_events(&pool).await?;
    let next_due = next_due_at(&pool).await?;
    reschedule(control_plane_pool, due, next_due).await?;

    Ok(())
}

/// Claims, sends and records one batch in a single transaction; returns how many it claimed.
async fn deliver_batch(
    context: &DeliveryContext,
    pool: &PgPool,
    targets: &DeliveryTargets,
) -> Result<usize, DeliveryRunError> {
    let mut transaction = pool.begin().await?;
    let claimed = claim_due_deliveries(&mut transaction, BATCH_SIZE).await?;
    let claimed_count = claimed.len();

    if claimed.is_empty() {
        transaction.commit().await?;
        return Ok(0);
    }

    let reports = send_claimed(&context.transport, targets, claimed).await;

    for report in &reports {
        record_attempt(&mut transaction, report).await?;
    }

    transaction.commit().await?;

    Ok(claimed_count)
}

async fn record_attempt(
    connection: &mut PgConnection,
    report: &AttemptReport,
) -> Result<(), sqlx::Error> {
    let delivery_id = report.delivery_id;

    match &report.outcome {
        DeliveryOutcome::Delivered { status } => {
            let attempt = AttemptResult {
                delivery_id,
                status: Some(*status),
                error: None,
            };
            mark_delivered(connection, attempt).await
        }
        DeliveryOutcome::Failed { status, error } => {
            let attempt = AttemptResult {
                delivery_id,
                status: *status,
                error: Some(error),
            };
            mark_failed(connection, attempt, next_retry(report)).await
        }
    }
}

fn next_retry(report: &AttemptReport) -> Option<std::time::Duration> {
    if report.can_retry == false {
        return None;
    }

    let failed_attempts = u32::try_from(report.previous_attempts)
        .ok()?
        .checked_add(1)?;

    retry_delay(failed_attempts)
}
