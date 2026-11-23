use serde_json::{Value, json};
use uuid::Uuid;

use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;

/// A fixed, made-up user: test events must never carry a real person's data.
const SAMPLE_USER_ID: &str = "00000000-0000-4000-8000-000000000001";
const SAMPLE_EMAIL: &str = "ana@exemplo.com";
const SAMPLE_TIME: &str = "2026-01-01T12:00:00Z";

/// What a real event of this type carries in `data`, filled with made-up values, so a test
/// exercises the receiver's actual handler.
pub fn sample_data(event_type: WebhookEventType) -> Value {
    match event_type {
        WebhookEventType::SessionRevoked => json!({
            "user_id": SAMPLE_USER_ID,
            "scope": "all",
            "session_id": Value::Null,
        }),
        WebhookEventType::AuditEvent => json!({ "event": sample_audit_event() }),
        WebhookEventType::UserBanned => json!({ "user": sample_user(Some(SAMPLE_TIME)) }),
        WebhookEventType::UserCreated
        | WebhookEventType::UserUpdated
        | WebhookEventType::UserDeleted
        | WebhookEventType::UserUnbanned => json!({ "user": sample_user(None) }),
    }
}

/// The same fields as the user snapshot real events publish.
fn sample_user(banned_at: Option<&str>) -> Value {
    json!({
        "id": SAMPLE_USER_ID,
        "email": SAMPLE_EMAIL,
        "email_verified_at": SAMPLE_TIME,
        "banned_at": banned_at,
        "created_at": SAMPLE_TIME,
        "mfa_enabled": false,
        "avatar_updated_at": Value::Null,
        "user_metadata": {},
        "app_metadata": {},
    })
}

fn sample_audit_event() -> Value {
    json!({
        "id": 1,
        "action": "login",
        "user_id": SAMPLE_USER_ID,
        "email": SAMPLE_EMAIL,
        "actor": "user",
        "actor_account_id": Value::Null,
        "login_method": "password",
        "ip_address": "203.0.113.7",
        "user_agent": "Mozilla/5.0",
        "request_id": Uuid::nil(),
        "details": Value::Null,
        "occurred_at": SAMPLE_TIME,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_events_carry_a_made_up_user() {
        let data = sample_data(WebhookEventType::UserCreated);

        assert_eq!(data.pointer("/user/email"), Some(&json!(SAMPLE_EMAIL)));
        assert_eq!(data.pointer("/user/banned_at"), Some(&Value::Null));
    }

    #[test]
    fn a_ban_sample_is_banned() {
        let data = sample_data(WebhookEventType::UserBanned);

        assert_eq!(data.pointer("/user/banned_at"), Some(&json!(SAMPLE_TIME)));
    }

    #[test]
    fn every_event_type_has_a_sample() {
        for event_type in WebhookEventType::ALL {
            assert!(sample_data(event_type).is_object(), "{event_type:?}");
        }
    }
}
