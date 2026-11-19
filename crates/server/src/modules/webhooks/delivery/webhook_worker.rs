use std::sync::Arc;
use std::time::Duration;

use tokio::sync::{Semaphore, watch};
use tokio::task::JoinSet;

use crate::modules::webhooks::audit_relay::activity_relay::relay_audit_events;
use crate::modules::webhooks::delivery::tenant_delivery_run::{DeliveryContext, deliver_tenant};
use crate::modules::webhooks::health::worker_heartbeat::{WorkerProgress, publish_heartbeats};
use crate::modules::webhooks::scheduling::webhook_schedule_repository::{
    DueTenant, due_tenants, mark_tenants_with_endpoints_due, reschedule, time_until_next_due,
};

/// Recovers events whose wake-up hint was lost; the only cost is one look at each tenant
/// with an enabled endpoint.
const SWEEP_INTERVAL: Duration = Duration::from_secs(5 * 60);
/// How often new activity log entries reach `audit.event` receivers.
const AUDIT_RELAY_INTERVAL: Duration = Duration::from_secs(5);
/// The API publishes schedule changes from a different process.
const MAX_IDLE: Duration = Duration::from_secs(1);
/// Lower bound between rounds, so a tenant that keeps failing cannot make the worker spin.
const MIN_IDLE: Duration = Duration::from_millis(250);
const DUE_TENANTS_PER_ROUND: i64 = 32;
/// Tenants delivered at once; each sends to at most its few endpoints in parallel.
const PARALLEL_TENANTS: usize = 4;
/// A tenant whose run failed (database down, undecryptable secret) is tried again later.
const FAILED_RUN_DELAY: time::Duration = time::Duration::seconds(60);

/// Polls the durable schedule for new work and periodically recovers lost wake-ups.
pub struct WebhookWorker {
    context: Arc<DeliveryContext>,
}

impl WebhookWorker {
    pub fn new(context: DeliveryContext) -> Self {
        Self {
            context: Arc::new(context),
        }
    }

    pub async fn run(self, stopped: watch::Receiver<bool>) {
        let pool = &self.context.control_plane_pool;
        let progress = self.context.progress.subscribe();
        tokio::join!(
            self.run_queue(stopped.clone()),
            self.run_audit_relay(stopped.clone()),
            publish_heartbeats(pool, progress, stopped)
        );
    }

    async fn run_queue(&self, mut stopped: watch::Receiver<bool>) {
        let mut sweep = tokio::time::interval(SWEEP_INTERVAL);

        loop {
            let idle = self.idle_time().await;

            tokio::select! {
                biased;
                _ = stopped.changed() => return,
                _ = sweep.tick() => self.sweep().await,
                _ = tokio::time::sleep(idle) => {}
            }

            self.deliver_due(&stopped).await;
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

    async fn run_audit_relay(&self, mut stopped: watch::Receiver<bool>) {
        let context = &self.context;
        let mut ticks = tokio::time::interval(AUDIT_RELAY_INTERVAL);
        ticks.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        loop {
            tokio::select! {
                _ = stopped.changed() => return,
                _ = ticks.tick() => {}
            }

            tokio::select! {
                _ = stopped.changed() => return,
                () = relay_audit_events(&context.control_plane_pool, &context.tenant_pools) => {}
            }
        }
    }

    async fn sweep(&self) {
        if let Err(error) = mark_tenants_with_endpoints_due(&self.context.control_plane_pool).await
        {
            tracing::error!(%error, "failed to sweep webhook endpoints");
        }
    }

    async fn deliver_due(&self, stopped: &watch::Receiver<bool>) {
        let due = match due_tenants(&self.context.control_plane_pool, DUE_TENANTS_PER_ROUND).await {
            Ok(due) => due,
            Err(error) => {
                tracing::error!(%error, "failed to read due webhook tenants");
                return;
            }
        };
        let slots = Arc::new(Semaphore::new(PARALLEL_TENANTS));
        self.context
            .progress
            .send_modify(WorkerProgress::record_poll);
        let mut runs = JoinSet::new();
        let oldest_due_seconds = due.first().map(|tenant| {
            tenant
                .checked_at
                .unix_timestamp()
                .saturating_sub(tenant.next_due_at.unix_timestamp())
        });
        tracing::debug!(
            due_tenants = due.len(),
            ?oldest_due_seconds,
            "loaded webhook schedule"
        );

        for tenant in due {
            if *stopped.borrow() {
                break;
            }

            runs.spawn(deliver_with_slot(
                Arc::clone(&self.context),
                Arc::clone(&slots),
                (tenant, stopped.clone()),
            ));
        }

        while let Some(joined) = runs.join_next().await {
            if let Err(error) = joined {
                tracing::error!(%error, "webhook delivery task failed");
            }
        }
    }
}

async fn deliver_with_slot(
    context: Arc<DeliveryContext>,
    slots: Arc<Semaphore>,
    (due, stopped): (DueTenant, watch::Receiver<bool>),
) {
    let _slot = match slots.acquire_owned().await {
        Ok(_slot) => _slot,
        Err(_) => return,
    };
    if *stopped.borrow() {
        return;
    }

    let tenant_id = due.tenant_id;
    let error = match deliver_tenant(&context, &due, &stopped).await {
        Err(error) => error,
        _ => return,
    };
    tracing::error!(%tenant_id, %error, "failed to deliver webhooks");
    let retry_at = match due.checked_at.checked_add(FAILED_RUN_DELAY) {
        Some(retry_at) => retry_at,
        None => return,
    };

    if let Err(error) = reschedule(&context.control_plane_pool, &due, Some(retry_at)).await {
        tracing::error!(%tenant_id, %error, "failed to postpone webhook deliveries");
    }
}

#[cfg(test)]
mod tests {
    use std::num::TryFromIntError;

    use super::*;
    use crate::modules::tenants::postgres::tenant_pool_limits::TenantPoolLimits;
    use crate::modules::webhooks::audit_relay::activity_relay::PARALLEL_SUBSCRIBERS;

    /// Tenant connections one worker process may hold, so its replicas fit beside the API under
    /// the Postgres server's default `max_connections` of 100.
    const TENANT_CONNECTION_BUDGET: u64 = 32;

    #[test]
    fn tenant_connections_stay_within_the_budget() -> Result<(), TryFromIntError> {
        let in_flight = u64::try_from(PARALLEL_TENANTS + PARALLEL_SUBSCRIBERS)?;
        let limits = TenantPoolLimits::WEBHOOK_WORKER;

        assert!(limits.max_connections(in_flight) <= TENANT_CONNECTION_BUDGET);
        Ok(())
    }
}
