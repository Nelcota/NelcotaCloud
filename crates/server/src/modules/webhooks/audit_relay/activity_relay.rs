use std::time::Duration;

use futures_util::stream::{self, StreamExt};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::audit::audit_retention::WEBHOOK_MAX_AGE_MINUTES;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::webhooks::audit_relay::audit_relay_repository::{
    EventWindow, RelayedAuditEvent, claim_events, finish_events,
};
use crate::modules::webhooks::audit_relay::audit_subscribers::{
    AuditSubscriber, audit_subscribers,
};
use crate::modules::webhooks::event::webhook_event::{WebhookEvent, WebhookEventError};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_outbox_repository::{
    OutboxBatch, OutboxEvent, insert_outbox_batch,
};
use crate::modules::webhooks::scheduling::webhook_schedule_repository::mark_due_now;

/// Events handed out per tenant and round; a busier log catches up over the next rounds.
const RELAY_BATCH: i64 = 200;
/// Subscribed tenants relayed at once; each holds one of its database connections.
pub const PARALLEL_SUBSCRIBERS: usize = 4;
const SUBSCRIBER_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Debug, thiserror::Error)]
pub enum RelayError {
    #[error("database error while relaying activity events: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Event(#[from] WebhookEventError),
    #[error("could not open the tenant database: {0}")]
    TenantPool(String),
}

/// Copies new activity log entries of every subscribed tenant into its webhook outbox, then
/// marks those tenants due so the worker delivers them. A tenant that fails is retried next round.
pub async fn relay_audit_events(control_plane_pool: &PgPool, tenant_pools: &TenantPoolRegistry) {
    let subscribers = match audit_subscribers(control_plane_pool).await {
        Ok(subscribers) => subscribers,
        Err(error) => {
            tracing::error!(%error, "failed to read activity webhook subscribers");
            return;
        }
    };

    let due: Vec<Uuid> = stream::iter(subscribers)
        .map(|subscriber| async move { relay_subscriber(tenant_pools, &subscriber).await })
        .buffer_unordered(PARALLEL_SUBSCRIBERS)
        .filter_map(std::future::ready)
        .collect()
        .await;

    if due.is_empty() == false
        && let Err(error) = mark_due_now(control_plane_pool, &due).await
    {
        tracing::error!(%error, "failed to schedule relayed activity events");
    }
}

async fn relay_subscriber(
    tenant_pools: &TenantPoolRegistry,
    subscriber: &AuditSubscriber,
) -> Option<Uuid> {
    let tenant_id = subscriber.tenant_id;
    let relayed =
        tokio::time::timeout(SUBSCRIBER_TIMEOUT, relay_tenant(tenant_pools, subscriber)).await;

    match relayed {
        Ok(Ok(0)) => None,
        Ok(Ok(_)) => Some(tenant_id),
        Ok(Err(error)) => {
            tracing::error!(%error, %tenant_id, "failed to relay activity events");
            None
        }
        Err(_) => {
            tracing::warn!(%tenant_id, "activity relay timed out");
            None
        }
    }
}

/// How many events went into the outbox.
async fn relay_tenant(
    tenant_pools: &TenantPoolRegistry,
    subscriber: &AuditSubscriber,
) -> Result<usize, RelayError> {
    let pool = tenant_pools
        .pool_for(subscriber.tenant_id)
        .await
        .map_err(|error| RelayError::TenantPool(error.to_string()))?;
    let mut transaction = pool.begin().await?;
    let window = EventWindow {
        limit: RELAY_BATCH,
        max_age_minutes: WEBHOOK_MAX_AGE_MINUTES,
    };
    let events = claim_events(&mut transaction, window).await?;
    if events.is_empty() {
        transaction.commit().await?;
        return Ok(0);
    }

    let event_ids: Vec<i64> = events.iter().map(|event| event.id).collect();
    let outbox_events = events
        .iter()
        .map(prepare_outbox_event)
        .collect::<Result<Vec<_>, _>>()?;
    let batch = OutboxBatch {
        events: &outbox_events,
        event_type: WebhookEventType::AuditEvent,
        endpoint_ids: &subscriber.endpoint_ids,
    };
    insert_outbox_batch(&mut transaction, batch).await?;
    finish_events(&mut transaction, &event_ids).await?;
    transaction.commit().await?;

    Ok(events.len())
}

/// One outbox entry per event, timestamped when the event happened.
fn prepare_outbox_event(event: &RelayedAuditEvent) -> Result<OutboxEvent, WebhookEventError> {
    let event_value = serde_json::to_value(event).map_err(WebhookEventError::from)?;
    let webhook_event = WebhookEvent {
        event_type: WebhookEventType::AuditEvent,
        data: json!({ "event": event_value }),
    };
    Ok(OutboxEvent {
        id: Uuid::new_v4(),
        payload: webhook_event.into_payload(event.occurred_at)?,
    })
}
