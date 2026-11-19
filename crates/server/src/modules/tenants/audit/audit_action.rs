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
    /// A login refused by the attempt limit before the password was checked.
    LoginRateLimited,
    /// A wrong code at the MFA step of a login.
    MfaCodeFailed,
    /// A rotated refresh token came back; its whole session was ended.
    RefreshTokenReused,
    SignedUp,
    EmailVerified,
    LoggedOut,
    MagicLinkSent,
    PasswordResetRequested,
    MfaEnabled,
    MfaDisabled,
    ApiKeyCreated,
    ApiKeyRevoked,
    /// A project setting changed; `details.section` says which.
    SettingsChanged,
    MemberInvited,
    MemberRemoved,
    MemberRoleChanged,
    OwnershipTransferred,
    MigrationApplied,
    /// A table, column or policy changed; `details` names the operation and the table.
    SchemaChanged,
    /// An address or range was blocked from the public auth routes; `details.network` says which.
    AddressBlocked,
    AddressUnblocked,
}

impl AuditAction {
    /// Changes an admin or the user made to an account.
    pub const USER_CHANGES: [Self; 7] = [
        Self::PasswordReset,
        Self::UserUpdated,
        Self::UserBanned,
        Self::UserUnbanned,
        Self::UserDeleted,
        Self::SessionsRevoked,
        Self::MfaReset,
    ];
}
