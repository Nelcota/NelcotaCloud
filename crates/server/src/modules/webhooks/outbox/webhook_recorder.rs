use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::webhooks::event::webhook_event::{WebhookEvent, WebhookEventError};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::modules::webhooks::outbox::webhook_hints::WebhookHints;
use crate::modules::webhooks::outbox::webhook_outbox_repository::{
    OutboxEntry, database_now, insert_outbox_entry,
};
use crate::modules::webhooks::outbox::webhook_subscriptions::{SubscribedEndpoint, endpoints_for};
use crate::shared::http::api_error::ApiError;

#[derive(Debug, thiserror::Error)]
pub enum RecordError {
    #[error("database error while recording a webhook event: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Event(#[from] WebhookEventError),
}

/// Records a request's webhook events in the tenant's outbox. Built once per request with the
/// tenant's current subscriptions.
///
/// Record inside the same transaction as the change, so the event commits or rolls back with
/// it. When dropped, at the end of the request and so after the commit, it wakes the delivery
/// worker for this tenant.
pub struct WebhookRecorder {
    tenant_id: Uuid,
    endpoints: Arc<Vec<SubscribedEndpoint>>,
    hints: WebhookHints,
    has_recorded: AtomicBool,
}

impl WebhookRecorder {
    pub fn new(
        tenant_id: Uuid,
        endpoints: Arc<Vec<SubscribedEndpoint>>,
        hints: WebhookHints,
    ) -> Self {
        Self {
            tenant_id,
            endpoints,
            hints,
            has_recorded: AtomicBool::new(false),
        }
    }

    /// Lets callers skip building an event (e.g. reading the user again) nobody receives.
    pub fn wants(&self, event_type: WebhookEventType) -> bool {
        endpoints_for(&self.endpoints, event_type).is_empty() == false
    }

    /// Does nothing when no enabled endpoint wants this event type.
    pub async fn record(
        &self,
        connection: &mut PgConnection,
        event: WebhookEvent,
    ) -> Result<(), RecordError> {
        let event_type = event.event_type;
        let endpoint_ids = endpoints_for(&self.endpoints, event_type);

        if endpoint_ids.is_empty() {
            return Ok(());
        }

        let occurred_at = database_now(connection).await?;
        let payload = event.into_payload(occurred_at)?;
        let entry = OutboxEntry {
            event_id: Uuid::new_v4(),
            event_type,
            payload: &payload,
            endpoint_ids: &endpoint_ids,
        };
        insert_outbox_entry(connection, entry).await?;
        self.has_recorded.store(true, Ordering::Relaxed);

        Ok(())
    }
}

impl From<RecordError> for ApiError {
    fn from(error: RecordError) -> Self {
        Self::internal(error)
    }
}

impl Drop for WebhookRecorder {
    fn drop(&mut self) {
        // A rolled back event only costs the worker one empty look at the tenant.
        if self.has_recorded.load(Ordering::Relaxed) {
            self.hints.hint(self.tenant_id);
        }
    }
}
