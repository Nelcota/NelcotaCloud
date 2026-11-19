use serde::Deserialize;
use utoipa::ToSchema;

use crate::modules::tenants::audit::audit_action::AuditAction;

/// Narrows the activity log to one kind of event.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum AuditKind {
    /// Successful logins.
    Logins,
    /// Refused login attempts (wrong email or password).
    Failures,
    /// Changes to a user: password, metadata, ban, deletion, sessions, authenticator.
    Changes,
    /// Signs of an attack: refused and throttled logins, wrong MFA codes, reused tokens.
    Security,
    /// The account's own life: signup, verification, logout, emailed links, MFA on or off.
    Account,
    /// Changes to the project: keys, settings, team, schema, migrations, blocked addresses.
    Project,
}

const SECURITY: [AuditAction; 4] = [
    AuditAction::LoginFailed,
    AuditAction::LoginRateLimited,
    AuditAction::MfaCodeFailed,
    AuditAction::RefreshTokenReused,
];

const ACCOUNT: [AuditAction; 7] = [
    AuditAction::SignedUp,
    AuditAction::EmailVerified,
    AuditAction::LoggedOut,
    AuditAction::MagicLinkSent,
    AuditAction::PasswordResetRequested,
    AuditAction::MfaEnabled,
    AuditAction::MfaDisabled,
];

const PROJECT: [AuditAction; 11] = [
    AuditAction::ApiKeyCreated,
    AuditAction::ApiKeyRevoked,
    AuditAction::SettingsChanged,
    AuditAction::MemberInvited,
    AuditAction::MemberRemoved,
    AuditAction::MemberRoleChanged,
    AuditAction::OwnershipTransferred,
    AuditAction::MigrationApplied,
    AuditAction::SchemaChanged,
    AuditAction::AddressBlocked,
    AuditAction::AddressUnblocked,
];

impl AuditKind {
    /// The actions of this kind, bound to the listing query as `action = ANY($3)`.
    pub fn actions(self) -> &'static [AuditAction] {
        match self {
            Self::Logins => &[AuditAction::LoggedIn],
            Self::Failures => &[AuditAction::LoginFailed],
            Self::Changes => &AuditAction::USER_CHANGES,
            Self::Security => &SECURITY,
            Self::Account => &ACCOUNT,
            Self::Project => &PROJECT,
        }
    }
}
