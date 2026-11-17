use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use uuid::Uuid;

use crate::modules::webhooks::delivery::tenant_delivery_run::{DeliveryContext, deliver_tenant};
use crate::modules::webhooks::delivery::webhook_schedule_repository::{
    DueTenant, due_tenants, mark_due_now, mark_tenants_with_endpoints_due, reschedule,
    time_until_next_due,
};
use crate::modules::webhooks::outbox::webhook_hints::WebhookHintReceiver;

/// Recovers events whose wake-up hint was lost; the only cost is one look at each tenant
/// with an enabled endpoint.
const SWEEP_INTERVAL: Duration = Duration::from_secs(5 * 60);
/// Upper bound on sleeping, in case a due time was set by another instance.
const MAX_IDLE: Duration = Duration::from_secs(30);
/// Lower bound between rounds, so a tenant that keeps failing cannot make the worker spin.
const MIN_IDLE: Duration = Duration::from_millis(250);
const DUE_TENANTS_PER_ROUND: i64 = 32;
/// Tenants delivered at once; each sends to at most its few endpoints in parallel.
const PARALLEL_TENANTS: usize = 4;
/// A tenant whose run failed (database down, undecryptable secret) is tried again later.
const FAILED_RUN_DELAY: time::Duration = time::Duration::seconds(60);

/// The background task that delivers webhooks: woken by hints from requests, by due retries
/// and by a periodic sweep. Many instances can run at once (deliveries are claimed with
/// `SKIP LOCKED`).
pub struct WebhookWorker {
    context: Arc<DeliveryContext>,
    hints: WebhookHintReceiver,
}

impl WebhookWorker {
    pub fn new(context: DeliveryContext, hints: WebhookHintReceiver) -> Self {
        Self {
            context: Arc::new(context),
            hints,
        }
    }

    /// Runs for the lifetime of the process (or of the test runtime).
    pub fn spawn(self) {
        tokio::spawn(self.run());
    }

    async fn run(mut self) {
        let mut sweep = tokio::time::interval(SWEEP_INTERVAL);

        loop {
            let idle = self.idle_time().await;

            tokio::select! {
                received = self.hints.recv() => {
                    let Some(tenant_id) = received else {
                        return;
                    };
                    self.mark_hinted(tenant_id).await;
                }
                _ = tokio::time::sleep(idle) => {}
                _ = sweep.tick() => self.sweep().await,
            }

            self.deliver_due().await;
        }
    }

    async fn idle_time(&self) -> Duration {
        let until_next = time_until_next_due(&self.context.control_plane_pool).await;
        let seconds = match until_next {
            Ok(Some(seconds)) => seconds,
            Ok(None) => return MAX_IDLE,
            Err(error) => {
                tracing::error!(%error, "failed to read the webhook schedule");
                return MAX_IDLE;
            }
        };
        let until_next = Duration::try_from_secs_f64(seconds).unwrap_or(MAX_IDLE);

        until_next.clamp(MIN_IDLE, MAX_IDLE)
    }

    /// Drains every hint already waiting, so a burst of requests costs one schedule write.
    async fn mark_hinted(&mut self, first: Uuid) {
        let mut tenant_ids = HashSet::from([first]);

        while let Ok(tenant_id) = self.hints.try_recv() {
            tenant_ids.insert(tenant_id);
        }

        let tenant_ids: Vec<Uuid> = tenant_ids.into_iter().collect();

        if let Err(error) = mark_due_now(&self.context.control_plane_pool, &tenant_ids).await {
            tracing::error!(%error, "failed to schedule hinted webhook deliveries");
        }
    }

    async fn sweep(&self) {
        if let Err(error) = mark_tenants_with_endpoints_due(&self.context.control_plane_pool).await
        {
            tracing::error!(%error, "failed to sweep webhook endpoints");
        }
    }

    async fn deliver_due(&self) {
        let due = match due_tenants(&self.context.control_plane_pool, DUE_TENANTS_PER_ROUND).await {
            Ok(due) => due,
            Err(error) => {
                tracing::error!(%error, "failed to read due webhook tenants");
                return;
            }
        };
        let slots = Arc::new(Semaphore::new(PARALLEL_TENANTS));
        let mut runs = JoinSet::new();

        for tenant in due {
            runs.spawn(deliver_with_slot(
                Arc::clone(&self.context),
                Arc::clone(&slots),
                tenant,
            ));
        }

        while let Some(joined) = runs.join_next().await {
            if let Err(error) = joined {
                tracing::error!(%error, "webhook delivery task failed");
            }
        }
    }
}

async fn deliver_with_slot(context: Arc<DeliveryContext>, slots: Arc<Semaphore>, due: DueTenant) {
    let Ok(_slot) = slots.acquire_owned().await else {
        return;
    };
    let tenant_id = due.tenant_id;
    let Err(error) = deliver_tenant(&context, &due).await else {
        return;
    };
    tracing::error!(%tenant_id, %error, "failed to deliver webhooks");
    let Some(retry_at) = due.checked_at.checked_add(FAILED_RUN_DELAY) else {
        return;
    };

    if let Err(error) = reschedule(&context.control_plane_pool, &due, Some(retry_at)).await {
        tracing::error!(%tenant_id, %error, "failed to postpone webhook deliveries");
    }
}
