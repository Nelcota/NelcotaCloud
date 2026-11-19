use uuid::Uuid;

#[derive(Clone, Copy, sqlx::FromRow)]
pub struct ObjectKey {
    pub tenant_id: Uuid,
    pub bucket_id: Uuid,
    pub id: Uuid,
}

impl ObjectKey {
    pub fn path(self) -> String {
        let Self {
            tenant_id,
            bucket_id,
            id,
        } = self;
        format!("projects/{tenant_id}/buckets/{bucket_id}/{id}")
    }
}
