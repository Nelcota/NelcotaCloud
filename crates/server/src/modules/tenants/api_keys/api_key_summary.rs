use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

/// What an owner sees about a key: never the key itself, only its last characters.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct ApiKeySummary {
    pub id: Uuid,
    /// `publishable` or `secret`.
    pub kind: String,
    /// The owner's label for the key; empty for keys created without one.
    pub name: String,
    /// Last characters of the key; empty for keys created before hints existed.
    pub hint: String,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339::option")]
    pub revoked_at: Option<OffsetDateTime>,
}
