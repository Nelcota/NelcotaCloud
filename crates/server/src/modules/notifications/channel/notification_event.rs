use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Something a project can be alerted about.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum NotificationEvent {
    /// A webhook endpoint refused deliveries for hours, or was paused after days.
    WebhookFailing,
    /// Many wrong passwords in a short time: someone may be guessing.
    LoginFailures,
    /// The Data API answered with server errors above the threshold in the last hour.
    DataApiErrors,
    /// Storage passed 80% of the project's bytes or files.
    StorageNearLimit,
}

impl NotificationEvent {
    pub const ALL: [Self; 4] = [
        Self::WebhookFailing,
        Self::LoginFailures,
        Self::DataApiErrors,
        Self::StorageNearLimit,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            Self::WebhookFailing => "webhook_failing",
            Self::LoginFailures => "login_failures",
            Self::DataApiErrors => "data_api_errors",
            Self::StorageNearLimit => "storage_near_limit",
        }
    }

    pub fn parse(raw: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|event| event.as_str() == raw)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_text() {
        for event in NotificationEvent::ALL {
            assert_eq!(NotificationEvent::parse(event.as_str()), Some(event));
        }

        assert_eq!(NotificationEvent::parse("deploy_failed"), None);
    }
}
