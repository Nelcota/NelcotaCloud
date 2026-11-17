use std::net::IpAddr;

use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::audit::audit_action::AuditAction;
use crate::modules::auth::audit::audit_actor::{AuditActor, AuditActorKind};
use crate::modules::auth::audit::login_method::LoginMethod;
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

    /// The typed email is kept because it may match no user (someone probing for accounts).
    pub fn failed_password_login(email: &str, ip_address: IpAddr) -> Self {
        Self {
            action: AuditAction::LoginFailed,
            user_id: None,
            email: Some(email.trim().to_lowercase()),
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
