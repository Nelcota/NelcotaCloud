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
    /// The name its owner gave it ("Sincronizar CRM"), if any.
    pub description: Option<String>,
    pub event_types: Vec<WebhookEventType>,
    /// Disabled endpoints receive no new events.
    pub is_enabled: bool,
    /// When its current run of refused attempts started; `null` while it delivers.
    #[serde(with = "time::serde::rfc3339::option")]
    pub failing_since: Option<OffsetDateTime>,
    /// When the platform paused it after failing for 5 days; `null` unless it did.
    #[serde(with = "time::serde::rfc3339::option")]
    pub auto_paused_at: Option<OffsetDateTime>,
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
            description: stored.description,
            event_types,
            is_enabled: stored.is_enabled,
            failing_since: stored.failing_since,
            auto_paused_at: stored.auto_paused_at,
            created_at: stored.created_at,
        }
    }
}
