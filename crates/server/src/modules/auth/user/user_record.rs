use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

/// Columns every query returning a `User` selects, in this order. A macro, so queries are
/// built at compile time with `concat!` instead of `format!` on every call.
macro_rules! user_columns {
    () => {
        "id, email, email_verified_at, banned_at, created_at, EXISTS (SELECT 1 FROM mfa_factors WHERE mfa_factors.user_id = users.id AND mfa_factors.verified_at IS NOT NULL) AS mfa_enabled"
    };
}
pub(crate) use user_columns;

#[derive(Debug, Clone, Serialize, sqlx::FromRow, ToSchema)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(with = "time::serde::rfc3339::option")]
    pub email_verified_at: Option<OffsetDateTime>,
    /// Set while the user is banned: no login, no refresh.
    #[serde(with = "time::serde::rfc3339::option")]
    pub banned_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    /// A verified TOTP authenticator is required at login.
    pub mfa_enabled: bool,
}

/// A user with the password hash, read only for password login.
#[derive(Debug, sqlx::FromRow)]
pub struct UserCredentials {
    #[sqlx(flatten)]
    pub user: User,
    pub password_hash: Option<String>,
}
