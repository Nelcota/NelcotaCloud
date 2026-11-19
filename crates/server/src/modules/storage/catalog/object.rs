use serde::Serialize;
use sqlx::FromRow;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, ToSchema, FromRow)]
pub struct StorageObject {
    pub id: Uuid,
    pub bucket_id: Uuid,
    pub name: String,
    pub content_type: String,
    pub size_bytes: i64,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(FromRow)]
pub struct ObjectRecord {
    #[sqlx(flatten)]
    pub object: StorageObject,
    pub is_ready: bool,
    pub confirm_until: OffsetDateTime,
    pub location: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct ObjectPage {
    pub items: Vec<StorageObject>,
    pub next_cursor: Option<String>,
}
