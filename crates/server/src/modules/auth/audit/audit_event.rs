use std::net::IpAddr;

use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::audit::audit_action::AuditAction;
use crate::modules::auth::audit::audit_actor::{AuditActor, AuditActorKind};
use crate::modules::auth::audit::login_method::LoginMethod;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::tenants::access::admin_actor::AdminActor;

/// An event about to be recorded.
pub struct NewAuditEvent {
    pub action: AuditAction,
    pub user_id: Option<Uuid>,
    pub email: Option<String>,
    pub actor: AuditActor,
    pub login_method: Option<LoginMethod>,
    pub ip_address: Option<IpAddr>,
}

impl NewAuditEvent {
    pub fn login(user_id: Uuid, method: LoginMethod, ip_address: IpAddr) -> Self {
        Self {
            action: AuditAction::LoggedIn,
            user_id: Some(user_id),
            email: None,
            actor: AuditActor::USER,
            login_method: Some(method),
            ip_address: Some(ip_address),
        }
    }

    /// The typed email is kept because it may match no user (someone probing for accounts);
    /// `user_id` is the account it names, so the attempt shows on that user's page. Only a
    /// valid address is ever passed: text that is not one is often a password typed (or
    /// autofilled) into the wrong field, and must never be stored.
    pub fn failed_password_login(
        email: Option<&EmailAddress>,
        user_id: Option<Uuid>,
        ip_address: IpAddr,
    ) -> Self {
        Self {
            action: AuditAction::LoginFailed,
            user_id,
            email: email.map(|address| address.as_str().to_owned()),
            actor: AuditActor::USER,
            login_method: Some(LoginMethod::Password),
            ip_address: Some(ip_address),
        }
    }

    pub fn by_user(action: AuditAction, user_id: Uuid, ip_address: IpAddr) -> Self {
        Self {
            action,
            user_id: Some(user_id),
            email: None,
            actor: AuditActor::USER,
            login_method: None,
            ip_address: Some(ip_address),
        }
    }

    pub fn by_admin(action: AuditAction, user_id: Uuid, admin: AdminActor) -> Self {
        Self {
            action,
            user_id: Some(user_id),
            email: None,
            actor: AuditActor::from(admin),
            login_method: None,
            ip_address: None,
        }
    }
}

/// A recorded event, as the activity log shows it.
#[derive(Debug, Serialize, sqlx::FromRow, ToSchema)]
pub struct AuditEvent {
    /// Increases with every event; pass the last one as `before` for the next page.
    pub id: i64,
    pub action: AuditAction,
    pub user_id: Option<Uuid>,
    /// The user's current email; on a failed login, the address that was typed. `null` once
    /// the user is deleted.
    pub email: Option<String>,
    pub actor: AuditActorKind,
    pub actor_account_id: Option<Uuid>,
    pub login_method: Option<LoginMethod>,
    pub ip_address: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub occurred_at: OffsetDateTime,
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use super::*;

    const CLIENT: IpAddr = IpAddr::V4(Ipv4Addr::LOCALHOST);

    #[test]
    fn names_the_account_a_failed_login_was_for() -> Result<(), Box<dyn std::error::Error>> {
        let email = EmailAddress::parse(" Ana@Example.com ")?;
        let user_id = Uuid::new_v4();
        let event = NewAuditEvent::failed_password_login(Some(&email), Some(user_id), CLIENT);

        assert_eq!(event.email.as_deref(), Some("ana@example.com"));
        assert_eq!(event.user_id, Some(user_id));
        Ok(())
    }

    #[test]
    fn keeps_no_email_when_none_was_valid() {
        let event = NewAuditEvent::failed_password_login(None, None, CLIENT);

        assert_eq!(event.email, None);
        assert_eq!(event.user_id, None);
    }
}
