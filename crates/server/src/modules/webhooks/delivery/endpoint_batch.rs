use std::collections::HashMap;
use std::sync::Arc;

use tokio::task::JoinSet;
use uuid::Uuid;

use crate::modules::webhooks::delivery::delivery_queue_repository::ClaimedDelivery;
use crate::modules::webhooks::delivery::delivery_targets::DeliveryTargets;
use crate::modules::webhooks::delivery::webhook_request::{
    DeliveryOutcome, DeliveryTarget, WebhookMessage,
};
use crate::modules::webhooks::delivery::webhook_transport::WebhookTransport;

/// What one attempt did, to be written back to the queue.
pub struct AttemptReport {
    pub delivery_id: Uuid,
    pub previous_attempts: i32,
    pub outcome: DeliveryOutcome,
    /// `false` when retrying cannot help (endpoint deleted or disabled).
    pub can_retry: bool,
}

/// Sends claimed deliveries: endpoints in parallel, each endpoint's deliveries one after the
/// other in queue order, so a slow receiver only delays itself and is never flooded.
pub async fn send_claimed(
    transport: &WebhookTransport,
    targets: &DeliveryTargets,
    claimed: Vec<ClaimedDelivery>,
) -> Vec<AttemptReport> {
    let mut reports = Vec::with_capacity(claimed.len());
    let mut sends = JoinSet::new();

    for (endpoint_id, deliveries) in group_by_endpoint(claimed) {
        // An endpoint unknown to this run was created (or enabled) after its targets were read:
        // its deliveries stay pending for the next run, which knows it. Deliveries of deleted
        // endpoints were given up when the run started.
        let Some(target) = targets.get(&endpoint_id) else {
            continue;
        };
        let transport = transport.clone();
        let target = Arc::clone(target);
        sends.spawn(send_in_order(transport, target, deliveries));
    }

    while let Some(joined) = sends.join_next().await {
        match joined {
            Ok(endpoint_reports) => reports.extend(endpoint_reports),
            Err(error) => tracing::error!(%error, "webhook send task failed"),
        }
    }

    reports
}

fn group_by_endpoint(claimed: Vec<ClaimedDelivery>) -> HashMap<Uuid, Vec<ClaimedDelivery>> {
    let mut groups: HashMap<Uuid, Vec<ClaimedDelivery>> = HashMap::new();

    for delivery in claimed {
        groups
            .entry(delivery.endpoint_id)
            .or_default()
            .push(delivery);
    }

    groups
}

async fn send_in_order(
    transport: WebhookTransport,
    target: Arc<DeliveryTarget>,
    deliveries: Vec<ClaimedDelivery>,
) -> Vec<AttemptReport> {
    let mut reports = Vec::with_capacity(deliveries.len());

    for delivery in deliveries {
        let message = WebhookMessage {
            id: delivery.event_id.to_string(),
            body: delivery.payload,
        };
        let outcome = transport.send(&target, &message).await;
        reports.push(AttemptReport {
            delivery_id: delivery.id,
            previous_attempts: delivery.attempts,
            outcome,
            can_retry: true,
        });
    }

    reports
}
