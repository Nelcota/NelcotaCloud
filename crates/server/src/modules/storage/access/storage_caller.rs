use uuid::Uuid;

#[derive(Clone, Copy)]
pub struct StorageCaller {
    pub tenant_id: Uuid,
    pub owner_id: Option<Uuid>,
}
