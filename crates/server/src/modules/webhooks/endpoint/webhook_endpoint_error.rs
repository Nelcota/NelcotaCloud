use crate::modules::webhooks::endpoint::webhook_url::WebhookUrlError;
use crate::modules::webhooks::event::webhook_event_type::UnknownEventType;
use crate::shared::crypto::secret_box::SecretBoxError;

#[derive(Debug, thiserror::Error)]
pub enum WebhookEndpointError {
    #[error(transparent)]
    InvalidUrl(#[from] WebhookUrlError),
    #[error("choose at least one event type")]
    NoEventTypes,
    #[error("a project can have at most 5 webhook endpoints")]
    LimitReached,
    #[error("webhook endpoint not found")]
    NotFound,
    #[error(transparent)]
    StoredEventType(#[from] UnknownEventType),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("database error while saving a webhook endpoint: {0}")]
    Database(#[from] sqlx::Error),
}
