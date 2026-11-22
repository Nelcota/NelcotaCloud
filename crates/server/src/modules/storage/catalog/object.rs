use serde::Serialize;
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, ToSchema, FromRow)]
pub struct StorageObject {
    pub id: Uuid,
    pub bucket_id: Uuid,
    pub name: String,
    pub content_type: String,
    pub size_bytes: i64,
}
