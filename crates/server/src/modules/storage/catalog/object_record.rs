use sqlx::FromRow;

use super::object::StorageObject;

#[derive(FromRow)]
pub struct ObjectRecord {
    #[sqlx(flatten)]
    pub object: StorageObject,
    pub is_ready: bool,
    pub can_confirm: bool,
}
