use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct Bucket {
    pub id: Uuid,
    pub name: String,
}
