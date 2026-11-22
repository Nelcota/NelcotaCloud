use futures_util::future::join_all;
use sqlx::PgPool;
use tokio::sync::watch;
use tokio::time::{Instant, timeout_at};
use uuid::Uuid;

use crate::modules::webhooks::delivery::delivery_claim_repository::{
    ClaimedDelivery, DeliveryLease, LEASE_DURATION, claim_due_deliveries,
};
use crate::modules::webhooks::delivery::delivery_queue_repository::{
    AttemptResult, DeliveredAttempt, mark_delivered, mark_failed,
};
use crate::modules::webhooks::delivery::delivery_targets::DeliveryTargets;
use crate::modules::webhooks::delivery::retry_schedule::retry_delay;
use crate::modules::webhooks::delivery::webhook_request::{
    AttemptReport, DeliveryOutcome, DeliveryTarget, WebhookMessage,
};
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;
use crate::modules::webhooks::endpoint::endpoint_health_repository::{
    record_endpoint_failure, record_endpoint_success,
};
use crate::modules::webhooks::health::worker_heartbeat::WorkerProgress;

/// What recording an attempt needs from its claim, once the payload has gone into the request.
struct ClaimedAttempt {
    lease: DeliveryLease,
    attempts: i32,
}

impl ClaimedAttempt {
    fn of(delivery: &ClaimedDelivery) -> Self {
        Self {
            lease: delivery.lease,
            attempts: delivery.attempts,
        }
    }
}

pub struct DeliveryBatch<'a> {
    pub pool: &'a PgPool,
    /// Where each endpoint's run of failures is kept, for the owners' alerts.
    pub control_plane_pool: &'a PgPool,
    pub transport: &'a WebhookTransport,
    pub targets: &'a DeliveryTargets,
    pub progress: &'a watch::Sender<WorkerProgress>,
}

impl DeliveryBatch<'_> {
    pub async fn run(&self) -> Result<usize, sqlx::Error> {
        let started = Instant::now();
        let endpoint_ids: Vec<_> = self.targets.keys().copied().collect();
        let claimed = claim_due_deliveries(self.pool, &endpoint_ids).await?;
        let count = claimed.len();

        if count == 0 {
            return Ok(0);
        }

        tracing::debug!(claimed = count, claim_ms = %started.elapsed().as_millis(), "claimed webhook deliveries");
        // The database sets the actual expiry after this clock starts. A conservative local
        // deadline prevents a delayed process from starting a send for an already expired lease.
        let deadline = started.checked_add(LEASE_DURATION).unwrap_or(started);
        let attempts = claimed.into_iter().filter_map(|delivery| {
            let target = self.targets.get(&delivery.endpoint_id)?;
            Some(self.send_and_record(target, (delivery, deadline)))
        });

        // Each endpoint finishes independently, even when another receiver is slow.
        let results = join_all(attempts).await;
        if results.iter().any(|result| matches!(result, Ok(true))) {
            self.progress.send_modify(WorkerProgress::record_batch);
        }

        for result in results {
            result?;
        }

        Ok(count)
    }

    async fn send_and_record(
        &self,
        target: &DeliveryTarget,
        (delivery, deadline): (ClaimedDelivery, Instant),
    ) -> Result<bool, sqlx::Error> {
        if Instant::now() >= deadline {
            return Ok(false);
        }

        let claimed = ClaimedAttempt::of(&delivery);
        let endpoint_id = delivery.endpoint_id;
        let message = WebhookMessage {
            id: delivery.event_id.to_string(),
            body: delivery.payload,
        };
        let sent = timeout_at(deadline, self.transport.send(target, &message)).await;
        let report = match sent {
            Ok(report) => report,
            Err(error) => {
                tracing::warn!(delivery_id = %claimed.lease.delivery_id, %error, "webhook send reached its lease deadline");
                return Ok(false);
            }
        };
        let is_delivered = matches!(report.outcome, DeliveryOutcome::Delivered { .. });
        let recorded = self.record(&claimed, report).await?;
        self.record_endpoint_health(endpoint_id, is_delivered).await;

        if recorded == false {
            tracing::warn!(delivery_id = %claimed.lease.delivery_id, "webhook attempt lost its lease before completion");
        }

        Ok(recorded)
    }

    async fn record(
        &self,
        delivery: &ClaimedAttempt,
        report: AttemptReport,
    ) -> Result<bool, sqlx::Error> {
        let lease = delivery.lease;
        let duration_ms = report.duration_ms;

        match report.outcome {
            DeliveryOutcome::Delivered { status } => {
                let attempt = DeliveredAttempt {
                    lease,
                    status,
                    duration_ms,
                };
                mark_delivered(self.pool, attempt).await
            }
            DeliveryOutcome::Failed { status, error } => {
                let attempt = AttemptResult {
                    lease,
                    status,
                    error: Some(&error),
                    duration_ms,
                    response_excerpt: report.response_excerpt.as_deref(),
                };
                let retry_in = u32::try_from(delivery.attempts)
                    .ok()
                    .and_then(|previous| previous.checked_add(1))
                    .and_then(retry_delay);
                mark_failed(self.pool, attempt, retry_in).await
            }
        }
    }

    /// Advisory: a control plane hiccup is logged and the delivery stays recorded.
    async fn record_endpoint_health(&self, endpoint_id: Uuid, is_delivered: bool) {
        let recorded = match is_delivered {
            true => record_endpoint_success(self.control_plane_pool, endpoint_id).await,
            false => record_endpoint_failure(self.control_plane_pool, endpoint_id).await,
        };

        if let Err(error) = recorded {
            tracing::warn!(%error, %endpoint_id, "could not record a webhook endpoint's health");
        }
    }
}
