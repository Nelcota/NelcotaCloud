use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::modules::notifications::channel::channel_target::ChannelKind;
use crate::modules::notifications::channel::notification_event::NotificationEvent;

/// A new channel: where to send, and which events.
#[derive(Deserialize, Validate, ToSchema)]
pub struct NewChannelBody {
    pub kind: ChannelKind,
    /// An email address, or the Discord or Slack incoming webhook URL.
    #[validate(length(min = 1, max = 2048))]
    pub target: String,
    #[validate(length(min = 1, max = 4))]
    pub events: Vec<NotificationEvent>,
}

/// The events a channel receives, replacing the previous ones.
#[derive(Deserialize, Validate, ToSchema)]
pub struct ChannelEventsBody {
    #[validate(length(min = 1, max = 4))]
    pub events: Vec<NotificationEvent>,
}

/// Each event once, in the order of `NotificationEvent::ALL`.
pub fn distinct_events(events: &[NotificationEvent]) -> Vec<NotificationEvent> {
    NotificationEvent::ALL
        .into_iter()
        .filter(|event| events.contains(event))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repeated_events_count_once() {
        let events = [
            NotificationEvent::StorageNearLimit,
            NotificationEvent::WebhookFailing,
            NotificationEvent::StorageNearLimit,
        ];

        assert_eq!(
            distinct_events(&events),
            vec![
                NotificationEvent::WebhookFailing,
                NotificationEvent::StorageNearLimit
            ]
        );
    }
}
