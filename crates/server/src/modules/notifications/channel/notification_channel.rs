use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::notifications::channel::channel_target::ChannelKind;
use crate::modules::notifications::channel::notification_event::NotificationEvent;

/// A channel as the console shows it: never the sealed destination, only its hint.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct NotificationChannel {
    pub id: Uuid,
    pub kind: ChannelKind,
    /// The email address, or `hooks.slack.com/…KEY9` for a chat webhook.
    pub target_hint: String,
    pub events: Vec<NotificationEvent>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationChannelList {
    pub channels: Vec<NotificationChannel>,
}

/// The authenticated-encryption context of a channel's destination: bound to its project and
/// its own id, so a sealed URL copied to another row does not open.
pub fn target_context(tenant_id: Uuid, channel_id: Uuid) -> String {
    format!("notification-channel:{tenant_id}:{channel_id}")
}
