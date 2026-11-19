use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::auth::user::user_listing::UserPage;
use crate::modules::auth::user::user_metadata::MetadataObject;
use crate::modules::auth::user::user_record::User;

#[derive(Debug, Serialize, ToSchema)]
#[schema(as = User)]
pub struct UserResponse {
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
    pub user_metadata: MetadataObject,
    /// Data only the project's admins write (roles, plans); also sent in access tokens as the
    /// `app_metadata` claim.
    #[schema(value_type = std::collections::HashMap<String, serde_json::Value>)]
    pub app_metadata: MetadataObject,
    /// When the user last logged in, by any method, even if that session has ended; `null` if
    /// they never did.
    #[serde(with = "time::serde::rfc3339::option")]
    pub last_sign_in_at: Option<OffsetDateTime>,
    /// The user can log in with email and password; passwordless accounts cannot.
    pub has_password: bool,
    /// The social providers linked to the account (`google`, `github`), in name order.
    pub providers: Vec<String>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            email_verified_at: user.email_verified_at,
            banned_at: user.banned_at,
            created_at: user.created_at,
            mfa_enabled: user.mfa_enabled,
            avatar_updated_at: user.avatar_updated_at,
            user_metadata: user.user_metadata.0,
            app_metadata: user.app_metadata.0,
            last_sign_in_at: user.last_sign_in_at,
            has_password: user.has_password,
            providers: user.providers,
        }
    }
}

/// One page of users, newest first, and how many match in total.
#[derive(Debug, Serialize, ToSchema)]
#[schema(as = UserPage)]
pub struct UserPageResponse {
    pub users: Vec<UserResponse>,
    pub total: i64,
}

impl From<UserPage> for UserPageResponse {
    fn from(page: UserPage) -> Self {
        Self {
            users: page.users.into_iter().map(UserResponse::from).collect(),
            total: page.total,
        }
    }
}
