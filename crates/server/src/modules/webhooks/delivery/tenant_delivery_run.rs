use std::sync::Arc;

use sqlx::PgPool;
use time::OffsetDateTime;
use tokio::sync::watch;

use crate::modules::tenants::postgres::tenant_pool_registry::{
    TenantPoolError, TenantPoolRegistry,
};
use crate::modules::webhooks::delivery::delivery_queue_repository::{
    abandon_orphaned_deliveries, delete_expired_events, next_due_at,
};
use crate::modules::webhooks::delivery::delivery_targets::{
    DeliveryTargetsError, load_delivery_targets,
};
use crate::modules::webhooks::delivery::endpoint_batch::DeliveryBatch;
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::modules::webhooks::health::worker_heartbeat::WorkerProgress;
use crate::modules::webhooks::scheduling::webhook_schedule_repository::{DueTenant, reschedule};
use crate::shared::crypto::secret_box::SecretBox;

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
    pub progress: watch::Sender<WorkerProgress>,
}

/// Delivers what is due for one tenant, then schedules its next run.
pub async fn deliver_tenant(
    context: &DeliveryContext,
    due: &DueTenant,
    stopped: &watch::Receiver<bool>,
) -> Result<(), DeliveryRunError> {
    let tenant_id = due.tenant_id;
    let pool = context.tenant_pools.pool_for(tenant_id).await?;
    let control_plane_pool = &context.control_plane_pool;
    for _ in 0..MAX_BATCHES_PER_RUN {
        if *stopped.borrow() {
            break;
        }

        if deliver_batch(context, &pool, due).await? == 0 {
            break;
        }
    }

    delete_expired_events(&pool).await?;
    let next_due = next_due_at(&pool).await?;
    reschedule(control_plane_pool, due, next_due).await?;

    Ok(())
}

async fn deliver_batch(
    context: &DeliveryContext,
    pool: &PgPool,
    due: &DueTenant,
) -> Result<usize, DeliveryRunError> {
    // Take the cutoff before fetching targets. Deliveries recorded while loading them can belong
    // to a newly created endpoint and must wait for a run that sees its configuration.
    let targets_loaded_at: OffsetDateTime = sqlx::query_scalar("SELECT clock_timestamp()")
        .fetch_one(pool)
        .await?;
    let loaded = load_delivery_targets(
        &context.control_plane_pool,
        &context.secret_box,
        due.tenant_id,
    )
    .await?;
    abandon_orphaned_deliveries(pool, &loaded.enabled_endpoint_ids, targets_loaded_at).await?;
    let batch = DeliveryBatch {
        pool,
        control_plane_pool: &context.control_plane_pool,
        transport: &context.transport,
        targets: &loaded.targets,
        progress: &context.progress,
    };

    Ok(batch.run().await?)
}
