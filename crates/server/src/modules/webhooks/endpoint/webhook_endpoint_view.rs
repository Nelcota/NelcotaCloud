use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::webhooks::endpoint::webhook_endpoint_repository::StoredWebhookEndpoint;
use crate::modules::webhooks::event::webhook_event_type::{WebhookEventType, known_event_types};

/// An endpoint as its owner sees it; the secret is never shown again after creation.
#[derive(Debug, Serialize, ToSchema)]
pub struct WebhookEndpointView {
    pub id: Uuid,
    pub url: String,
    pub event_types: Vec<WebhookEventType>,
    /// Disabled endpoints receive no new events.
    pub is_enabled: bool,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

/// Answer of creating an endpoint or rotating its secret: the only time the secret is shown.
#[derive(Debug, Serialize, ToSchema)]
pub struct WebhookEndpointWithSecret {
    pub endpoint: WebhookEndpointView,
    /// `whsec_…`: verify the `webhook-signature` header with it (Standard Webhooks).
    pub secret: String,
}

impl From<StoredWebhookEndpoint> for WebhookEndpointView {
    fn from(stored: StoredWebhookEndpoint) -> Self {
        let event_types = known_event_types(&stored.event_types);

        Self {
            id: stored.id,
            url: stored.url,
            event_types,
            is_enabled: stored.is_enabled,
            created_at: stored.created_at,
        }
    }
}
