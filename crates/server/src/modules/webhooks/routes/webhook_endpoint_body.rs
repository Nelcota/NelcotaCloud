use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;

/// The longest URL accepted, as in `WebhookUrl`.
const MAX_URL_LENGTH: u64 = 2048;

#[derive(Deserialize, Validate, ToSchema)]
pub struct WebhookEndpointBody {
    /// `https://…` on a public host; it receives signed `POST` requests.
    #[validate(length(min = 1, max = MAX_URL_LENGTH))]
    pub url: String,
    /// The events this endpoint receives.
    #[validate(length(min = 1, max = 6))]
    pub event_types: Vec<WebhookEventType>,
}

/// Only the fields sent are changed.
#[derive(Deserialize, Validate, ToSchema)]
pub struct WebhookEndpointChangesBody {
    #[validate(length(min = 1, max = MAX_URL_LENGTH))]
    pub url: Option<String>,
    #[validate(length(min = 1, max = 6))]
    pub event_types: Option<Vec<WebhookEventType>>,
    /// Disabled endpoints receive no new events.
    pub is_enabled: Option<bool>,
}
