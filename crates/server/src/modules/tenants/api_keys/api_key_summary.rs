use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

/// What an owner sees about a key: its last characters, and the key itself only when publishable.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct ApiKeySummary {
    pub id: Uuid,
    /// `publishable` or `secret`.
    pub kind: String,
    /// The owner's label for the key; empty for keys created without one.
    pub name: String,
    /// Last characters of the key; empty for keys created before hints existed.
    pub hint: String,
    /// The whole key, for publishable keys created since keys are kept; never for secret keys.
    pub key: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339::option")]
    pub revoked_at: Option<OffsetDateTime>,
}
