use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use super::object::StorageObject;

#[derive(Serialize, ToSchema)]
pub struct ObjectPage {
    pub items: Vec<StorageObject>,
    pub next_cursor: Option<Uuid>,
}
