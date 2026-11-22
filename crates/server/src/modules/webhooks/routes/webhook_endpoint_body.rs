use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;

/// The longest URL accepted, as in `WebhookUrl`.
const MAX_URL_LENGTH: u64 = 2048;
/// Bytes, a loose bound before `parse_description` counts characters (80 at most).
const MAX_DESCRIPTION_BYTES: u64 = 320;
/// Every event type at most once; kept equal to `EVENT_TYPE_COUNT` by a test.
const MAX_EVENT_TYPES: u64 = 7;

#[derive(Deserialize, Validate, ToSchema)]
pub struct WebhookEndpointBody {
    /// `https://…` on a public host; it receives signed `POST` requests.
    #[validate(length(min = 1, max = MAX_URL_LENGTH))]
    pub url: String,
    /// A name for the endpoint ("Sincronizar CRM"), up to 80 characters on one line.
    #[validate(length(max = MAX_DESCRIPTION_BYTES))]
    pub description: Option<String>,
    /// The events this endpoint receives.
    #[validate(length(min = 1, max = MAX_EVENT_TYPES))]
    pub event_types: Vec<WebhookEventType>,
}

/// Only the fields sent are changed.
#[derive(Deserialize, Validate, ToSchema)]
pub struct WebhookEndpointChangesBody {
    #[validate(length(min = 1, max = MAX_URL_LENGTH))]
    pub url: Option<String>,
    /// A new name; an empty one removes it.
    #[validate(length(max = MAX_DESCRIPTION_BYTES))]
    pub description: Option<String>,
    #[validate(length(min = 1, max = MAX_EVENT_TYPES))]
    pub event_types: Option<Vec<WebhookEventType>>,
    /// Disabled endpoints receive no new events.
    pub is_enabled: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::webhooks::event::webhook_event_type::EVENT_TYPE_COUNT;

    #[test]
    fn accepts_every_event_type_at_most_once() {
        assert_eq!(u64::try_from(EVENT_TYPE_COUNT), Ok(MAX_EVENT_TYPES));
    }
}
