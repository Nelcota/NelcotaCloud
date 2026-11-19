use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::access::admin_actor::AdminActor;

/// Who did what an audit event records.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "text", rename_all = "snake_case")]
pub enum AuditActorKind {
    /// The user themself (or whoever tried to log in as them).
    User,
    /// A server holding the project's secret API key.
    SecretKey,
    /// A console account; its id is in `actor_account_id`.
    ConsoleAccount,
}

/// The actor as stored: its kind, plus the console account when there is one.
pub struct AuditActor {
    pub kind: AuditActorKind,
    pub account_id: Option<Uuid>,
}

impl AuditActor {
    pub const USER: Self = Self {
        kind: AuditActorKind::User,
        account_id: None,
    };
}

impl From<AdminActor> for AuditActor {
    fn from(admin: AdminActor) -> Self {
        match admin {
            AdminActor::SecretKey => Self {
                kind: AuditActorKind::SecretKey,
                account_id: None,
            },
            AdminActor::ConsoleAccount(account_id) => Self {
                kind: AuditActorKind::ConsoleAccount,
                account_id: Some(account_id),
            },
        }
    }
}
