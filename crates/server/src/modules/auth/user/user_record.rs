use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

/// Columns every query returning a `User` selects, in this order.
pub(crate) const USER_COLUMNS: &str = "id, email, email_verified_at, created_at";

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(with = "time::serde::rfc3339::option")]
    pub email_verified_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

/// A user with the password hash, read only for password login.
#[derive(Debug, sqlx::FromRow)]
pub struct UserCredentials {
    #[sqlx(flatten)]
    pub user: User,
    pub password_hash: Option<String>,
}
