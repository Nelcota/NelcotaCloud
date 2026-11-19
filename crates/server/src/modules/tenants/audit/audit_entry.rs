use serde_json::Value;
use uuid::Uuid;

use crate::modules::tenants::access::admin_actor::AdminActor;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_actor::AuditActor;
use crate::modules::tenants::audit::login_method::LoginMethod;
use crate::shared::http::request_origin::RequestOrigin;

/// An event about to be recorded.
pub struct NewAuditEvent {
    pub action: AuditAction,
    pub user_id: Option<Uuid>,
    pub email: Option<String>,
    pub actor: AuditActor,
    pub login_method: Option<LoginMethod>,
    pub origin: Option<RequestOrigin>,
    /// A small object chosen by the server; never a request body or a secret.
    pub details: Option<Value>,
}

impl NewAuditEvent {
    /// Something the user did to their own account.
    pub fn by_user(action: AuditAction, user_id: Uuid, origin: RequestOrigin) -> Self {
        Self {
            action,
            user_id: Some(user_id),
            email: None,
            actor: AuditActor::USER,
            login_method: None,
            origin: Some(origin),
            details: None,
        }
    }

    /// Something an admin did to one user; `admin` is who did it and where the request came from.
    pub fn by_admin(
        action: AuditAction,
        user_id: Uuid,
        admin: (AdminActor, &RequestOrigin),
    ) -> Self {
        Self {
            user_id: Some(user_id),
            ..Self::on_project(action, admin)
        }
    }

    /// Something an admin did to the project itself, with no user involved.
    pub fn on_project(action: AuditAction, (actor, origin): (AdminActor, &RequestOrigin)) -> Self {
        Self {
            action,
            user_id: None,
            email: None,
            actor: AuditActor::from(actor),
            login_method: None,
            origin: Some(origin.clone()),
            details: None,
        }
    }

    pub fn with_details(self, details: Value) -> Self {
        Self {
            details: Some(details),
            ..self
        }
    }
}

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, Ipv4Addr};

    use serde_json::json;

    use super::*;
    use crate::modules::tenants::audit::audit_actor::AuditActorKind;

    fn origin() -> RequestOrigin {
        RequestOrigin::from_ip(IpAddr::V4(Ipv4Addr::LOCALHOST))
    }

    #[test]
    fn a_project_event_names_no_user() {
        let account_id = Uuid::new_v4();
        let admin = (AdminActor::ConsoleAccount(account_id), &origin());
        let event = NewAuditEvent::on_project(AuditAction::ApiKeyCreated, admin)
            .with_details(json!({ "name": "server" }));

        assert_eq!(event.user_id, None);
        assert_eq!(event.actor.kind, AuditActorKind::ConsoleAccount);
        assert_eq!(event.actor.account_id, Some(account_id));
        assert_eq!(event.details, Some(json!({ "name": "server" })));
    }

    #[test]
    fn an_admin_event_keeps_the_user_and_the_origin() {
        let user_id = Uuid::new_v4();
        let admin = (AdminActor::SecretKey, &origin());
        let event = NewAuditEvent::by_admin(AuditAction::UserBanned, user_id, admin);

        assert_eq!(event.user_id, Some(user_id));
        assert_eq!(event.actor.kind, AuditActorKind::SecretKey);
        assert_eq!(event.origin, Some(origin()));
    }
}
