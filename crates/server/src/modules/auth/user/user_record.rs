use sqlx::types::Json;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::user::user_metadata::MetadataObject;

/// Columns every query returning a `User` selects, in this order. A macro, so queries are
/// built at compile time with `concat!` instead of `format!` on every call.
macro_rules! user_columns {
    () => {
        "id, email, email_verified_at, banned_at, created_at, EXISTS (SELECT 1 FROM mfa_factors WHERE mfa_factors.user_id = users.id AND mfa_factors.verified_at IS NOT NULL) AS mfa_enabled, (SELECT user_avatars.updated_at FROM user_avatars WHERE user_avatars.user_id = users.id) AS avatar_updated_at, user_metadata, app_metadata, last_sign_in_at, password_hash IS NOT NULL AS has_password, ARRAY(SELECT identities.provider FROM identities WHERE identities.user_id = users.id ORDER BY identities.provider) AS providers"
    };
}
pub(crate) use user_columns;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub email_verified_at: Option<OffsetDateTime>,
    /// Set while the user is banned: no login, no refresh.
    pub banned_at: Option<OffsetDateTime>,
    pub created_at: OffsetDateTime,
    /// A verified TOTP authenticator is required at login.
    pub mfa_enabled: bool,
    /// When the profile photo last changed; `null` without one. Served at
    /// `/auth/v1/users/{id}/avatar`, with this value as `version` so caches fetch a new photo.
    pub avatar_updated_at: Option<OffsetDateTime>,
    /// Profile data the user writes themself (`PATCH /auth/v1/user`).
    pub user_metadata: Json<MetadataObject>,
    /// Data only the project's admins write (roles, plans); also sent in access tokens as the
    /// `app_metadata` claim.
    pub app_metadata: Json<MetadataObject>,
    /// When the user last logged in, by any method; `None` if they never did.
    pub last_sign_in_at: Option<OffsetDateTime>,
    /// The user can log in with email and password (passwordless accounts cannot).
    pub has_password: bool,
    /// The social providers linked to the account (`google`, `github`), in name order.
    pub providers: Vec<String>,
}

/// A user with the password hash, read only for password login.
#[derive(Debug, sqlx::FromRow)]
pub struct UserCredentials {
    #[sqlx(flatten)]
    pub user: User,
    pub password_hash: Option<String>,
}
