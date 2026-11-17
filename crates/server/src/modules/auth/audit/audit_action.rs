use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// What an audit event records. Stored as text; renaming one is a breaking change.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "text", rename_all = "snake_case")]
pub enum AuditAction {
    LoggedIn,
    LoginFailed,
    PasswordReset,
    UserUpdated,
    UserBanned,
    UserUnbanned,
    UserDeleted,
    SessionsRevoked,
    MfaReset,
}
