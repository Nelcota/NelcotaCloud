use std::collections::HashSet;

use sqlx::PgPool;
use tokio::sync::mpsc;
use tokio::sync::mpsc::error::TrySendError;
use tokio::sync::watch;
use uuid::Uuid;

use crate::modules::webhooks::scheduling::webhook_schedule_repository::mark_due_now;

/// Enough for bursts; when full, hints are dropped and the periodic sweep finds the events.
const HINT_CHANNEL_CAPACITY: usize = 4096;

/// Hands a post-commit wake-up to the API's schedule publisher without blocking the request.
#[derive(Clone)]
pub struct WebhookHints {
    sender: mpsc::Sender<Uuid>,
}

pub type WebhookHintReceiver = mpsc::Receiver<Uuid>;

impl WebhookHints {
    pub fn channel() -> (Self, WebhookHintReceiver) {
        let (sender, receiver) = mpsc::channel(HINT_CHANNEL_CAPACITY);

        (Self { sender }, receiver)
    }

    /// Never waits: a request must not slow down because the worker is busy.
    pub fn hint(&self, tenant_id: Uuid) {
        match self.sender.try_send(tenant_id) {
            Ok(()) => {}
            Err(TrySendError::Full(_)) => {
                tracing::warn!(%tenant_id, "webhook hint channel full; the sweep will deliver");
            }
            Err(TrySendError::Closed(_)) => {
                tracing::warn!(%tenant_id, "webhook schedule publisher has stopped; the sweep will deliver");
            }
        }
    }
}

pub async fn publish_hints(
    pool: PgPool,
    mut hints: WebhookHintReceiver,
    mut stopped: watch::Receiver<bool>,
) {
    loop {
        let first = tokio::select! {
            biased;
            _ = stopped.changed() => {
                hints.close();
                hints.recv().await
            }
            first = hints.recv() => first,
        };
        let mut tenant_ids = match first {
            Some(tenant_id) => HashSet::from([tenant_id]),
            None => return,
        };

        while let Ok(tenant_id) = hints.try_recv() {
            tenant_ids.insert(tenant_id);
        }

        let tenant_ids: Vec<_> = tenant_ids.into_iter().collect();

        if let Err(error) = mark_due_now(&pool, &tenant_ids).await {
            tracing::error!(%error, "failed to publish webhook hints; the sweep will deliver");
        }
    }
}
