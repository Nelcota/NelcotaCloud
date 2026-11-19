use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, sqlx::FromRow, ToSchema)]
pub struct MigrationRecord {
    pub version: i64,
    pub name: String,
    #[serde(with = "time::serde::rfc3339")]
    #[schema(value_type = String, format = DateTime)]
    pub applied_at: OffsetDateTime,
    /// Console account that applied the migration, or null for a secret API key.
    pub actor_account_id: Option<Uuid>,
}
