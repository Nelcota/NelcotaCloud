use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::auth::user::user_metadata::MetadataObject;
use crate::modules::auth::user::user_record::User;

/// The published webhook fields are chosen here independently of the HTTP and SQL models.
#[derive(Serialize)]
pub(super) struct UserEventSnapshot<'a> {
    id: Uuid,
    email: &'a str,
    #[serde(with = "time::serde::rfc3339::option")]
    email_verified_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339::option")]
    banned_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339")]
    created_at: OffsetDateTime,
    mfa_enabled: bool,
    #[serde(with = "time::serde::rfc3339::option")]
    avatar_updated_at: Option<OffsetDateTime>,
    user_metadata: &'a MetadataObject,
    app_metadata: &'a MetadataObject,
}

impl<'a> From<&'a User> for UserEventSnapshot<'a> {
    fn from(user: &'a User) -> Self {
        Self {
            id: user.id,
            email: &user.email,
            email_verified_at: user.email_verified_at,
            banned_at: user.banned_at,
            created_at: user.created_at,
            mfa_enabled: user.mfa_enabled,
            avatar_updated_at: user.avatar_updated_at,
            user_metadata: &user.user_metadata.0,
            app_metadata: &user.app_metadata.0,
        }
    }
}
