use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// What happened, as receivers see it in `type`. Renaming one is a breaking change.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
pub enum WebhookEventType {
    #[serde(rename = "user.created")]
    UserCreated,
    /// Email verified, password, photo or authenticator changed.
    #[serde(rename = "user.updated")]
    UserUpdated,
    #[serde(rename = "user.deleted")]
    UserDeleted,
    #[serde(rename = "user.banned")]
    UserBanned,
    #[serde(rename = "user.unbanned")]
    UserUnbanned,
    /// Sessions ended by the user or an admin (not a plain sign out).
    #[serde(rename = "session.revoked")]
    SessionRevoked,
    /// Every new activity log entry: logins, refusals, account and project changes.
    #[serde(rename = "audit.event")]
    AuditEvent,
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("unknown webhook event type: {0}")]
pub struct UnknownEventType(pub String);

/// How many event types exist; request bodies accept at most this many.
pub const EVENT_TYPE_COUNT: usize = 7;

impl WebhookEventType {
    pub const ALL: [Self; EVENT_TYPE_COUNT] = [
        Self::UserCreated,
        Self::UserUpdated,
        Self::UserDeleted,
        Self::UserBanned,
        Self::UserUnbanned,
        Self::SessionRevoked,
        Self::AuditEvent,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            Self::UserCreated => "user.created",
            Self::UserUpdated => "user.updated",
            Self::UserDeleted => "user.deleted",
            Self::UserBanned => "user.banned",
            Self::UserUnbanned => "user.unbanned",
            Self::SessionRevoked => "session.revoked",
            Self::AuditEvent => "audit.event",
        }
    }

    pub fn parse(raw: &str) -> Result<Self, UnknownEventType> {
        let found = Self::ALL.into_iter().find(|kind| kind.as_str() == raw);

        found.ok_or_else(|| UnknownEventType(raw.to_owned()))
    }
}

/// Unknown stored names should not prevent delivery of known event types.
pub fn known_event_types(raw: &[String]) -> Vec<WebhookEventType> {
    raw.iter()
        .filter_map(|name| match WebhookEventType::parse(name) {
            Ok(event_type) => Some(event_type),
            Err(error) => {
                tracing::warn!(%error, "skipping an unknown stored webhook event type");
                None
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_round_trip_and_match_serde() -> Result<(), Box<dyn std::error::Error>> {
        for kind in WebhookEventType::ALL {
            assert_eq!(WebhookEventType::parse(kind.as_str())?, kind);
            assert_eq!(serde_json::to_value(kind)?, kind.as_str());
        }

        Ok(())
    }

    #[test]
    fn refuses_unknown_names() {
        let parsed = WebhookEventType::parse("user.exploded");

        assert_eq!(parsed, Err(UnknownEventType("user.exploded".to_owned())));
    }
}
