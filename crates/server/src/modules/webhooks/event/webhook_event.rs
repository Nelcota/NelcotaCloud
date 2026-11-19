use serde::Serialize;
use serde_json::{Value, json};
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;
use uuid::Uuid;

use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;

#[derive(Debug, thiserror::Error)]
pub enum WebhookEventError {
    #[error("failed to serialize webhook event data: {0}")]
    Serialize(#[from] serde_json::Error),
    #[error("failed to format webhook event time: {0}")]
    Timestamp(#[from] time::error::Format),
}

/// One thing that happened in a tenant, before it is written to the outbox.
pub struct WebhookEvent {
    pub event_type: WebhookEventType,
    pub data: Value,
}

/// Which sessions a `session.revoked` event ended.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RevokedSessions {
    One,
    Others,
    All,
}

impl WebhookEvent {
    /// Wraps the published user snapshot at the time of the change.
    pub fn about_user(
        event_type: WebhookEventType,
        user: &impl Serialize,
    ) -> Result<Self, WebhookEventError> {
        let data = json!({ "user": serde_json::to_value(user)? });

        Ok(Self { event_type, data })
    }

    pub fn sessions_revoked(
        user_id: Uuid,
        scope: RevokedSessions,
        session_id: Option<Uuid>,
    ) -> Self {
        let data = json!({ "user_id": user_id, "scope": scope, "session_id": session_id });

        Self {
            event_type: WebhookEventType::SessionRevoked,
            data,
        }
    }

    /// The body receivers get, in the Standard Webhooks shape: `type`, `timestamp`, `data`.
    pub fn into_payload(self, occurred_at: OffsetDateTime) -> Result<Value, WebhookEventError> {
        let timestamp = occurred_at.format(&Rfc3339)?;

        Ok(json!({
            "type": self.event_type.as_str(),
            "timestamp": timestamp,
            "data": self.data,
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payload_has_type_timestamp_and_data() -> Result<(), WebhookEventError> {
        let user = json!({ "id": "u1", "email": "ana@example.com" });
        let event = WebhookEvent::about_user(WebhookEventType::UserCreated, &user)?;
        let payload = event.into_payload(OffsetDateTime::UNIX_EPOCH)?;

        assert_eq!(payload.pointer("/type"), Some(&json!("user.created")));
        assert_eq!(
            payload.pointer("/timestamp"),
            Some(&json!("1970-01-01T00:00:00Z"))
        );
        assert_eq!(
            payload.pointer("/data/user/email"),
            Some(&json!("ana@example.com"))
        );
        Ok(())
    }

    #[test]
    fn session_events_name_the_scope() -> Result<(), WebhookEventError> {
        let user_id = Uuid::nil();
        let event = WebhookEvent::sessions_revoked(user_id, RevokedSessions::Others, None);
        let payload = event.into_payload(OffsetDateTime::UNIX_EPOCH)?;

        assert_eq!(payload.pointer("/type"), Some(&json!("session.revoked")));
        assert_eq!(payload.pointer("/data/scope"), Some(&json!("others")));
        assert_eq!(payload.pointer("/data/session_id"), Some(&Value::Null));
        Ok(())
    }
}
