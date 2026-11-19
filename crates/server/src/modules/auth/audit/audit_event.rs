use serde::Serialize;
use serde_json::Value;
use sqlx::types::Json;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_actor::AuditActorKind;
use crate::modules::tenants::audit::login_method::LoginMethod;

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
    /// As the client sent it; a description, never proof.
    pub user_agent: Option<String>,
    /// The id the server gave the request, also sent back in `x-request-id`.
    pub request_id: Option<String>,
    /// A few facts about the change: `section`, `operation`, `table`, `name` or `role`.
    #[schema(value_type = Option<Object>)]
    pub details: Option<Json<Value>>,
    #[serde(with = "time::serde::rfc3339")]
    pub occurred_at: OffsetDateTime,
}
