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
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("unknown webhook event type: {0}")]
pub struct UnknownEventType(pub String);

impl WebhookEventType {
    pub const ALL: [Self; 6] = [
        Self::UserCreated,
        Self::UserUpdated,
        Self::UserDeleted,
        Self::UserBanned,
        Self::UserUnbanned,
        Self::SessionRevoked,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            Self::UserCreated => "user.created",
            Self::UserUpdated => "user.updated",
            Self::UserDeleted => "user.deleted",
            Self::UserBanned => "user.banned",
            Self::UserUnbanned => "user.unbanned",
            Self::SessionRevoked => "session.revoked",
        }
    }

    pub fn parse(raw: &str) -> Result<Self, UnknownEventType> {
        let found = Self::ALL.into_iter().find(|kind| kind.as_str() == raw);

        found.ok_or_else(|| UnknownEventType(raw.to_owned()))
    }
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
