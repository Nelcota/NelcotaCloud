use serde::Serialize;
use sqlx::types::Json;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::user::user_metadata::MetadataObject;

/// Columns every query returning a `User` selects, in this order. A macro, so queries are
/// built at compile time with `concat!` instead of `format!` on every call.
macro_rules! user_columns {
    () => {
        "id, email, email_verified_at, banned_at, created_at, EXISTS (SELECT 1 FROM mfa_factors WHERE mfa_factors.user_id = users.id AND mfa_factors.verified_at IS NOT NULL) AS mfa_enabled, (SELECT user_avatars.updated_at FROM user_avatars WHERE user_avatars.user_id = users.id) AS avatar_updated_at, user_metadata, app_metadata"
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
    /// When the profile photo last changed; `null` without one. Served at
    /// `/auth/v1/users/{id}/avatar`, with this value as `version` so caches fetch a new photo.
    #[serde(with = "time::serde::rfc3339::option")]
    pub avatar_updated_at: Option<OffsetDateTime>,
    /// Profile data the user writes themself (`PATCH /auth/v1/user`).
    #[schema(value_type = std::collections::HashMap<String, serde_json::Value>)]
    pub user_metadata: Json<MetadataObject>,
    /// Data only the project's admins write (roles, plans); also sent in access tokens as the
    /// `app_metadata` claim.
    #[schema(value_type = std::collections::HashMap<String, serde_json::Value>)]
    pub app_metadata: Json<MetadataObject>,
}

/// A user with the password hash, read only for password login.
#[derive(Debug, sqlx::FromRow)]
pub struct UserCredentials {
    #[sqlx(flatten)]
    pub user: User,
    pub password_hash: Option<String>,
}
