use tokio::sync::mpsc;
use tokio::sync::mpsc::error::TrySendError;
use uuid::Uuid;

/// Enough for bursts; when full, hints are dropped and the periodic sweep finds the events.
const HINT_CHANNEL_CAPACITY: usize = 4096;

/// Tells the delivery worker that a tenant just committed webhook events, so it delivers them
/// in milliseconds instead of waiting for its next sweep.
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
                tracing::error!(%tenant_id, "webhook worker is not running");
            }
        }
    }
}
