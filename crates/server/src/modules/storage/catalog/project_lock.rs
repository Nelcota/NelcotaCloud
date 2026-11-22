use sqlx::PgTransaction;
use uuid::Uuid;

use crate::modules::storage::rejection::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

pub(super) async fn lock_project(
    transaction: &mut PgTransaction<'_>,
    tenant: Uuid,
) -> Result<(), ApiError> {
    let project = sqlx::query_scalar::<_, Uuid>("SELECT id FROM tenants WHERE id = $1 FOR UPDATE")
        .bind(tenant)
        .fetch_optional(&mut **transaction)
        .await?;

    if project.is_none() {
        return Err(StorageError::BucketNotFound.into());
    }

    Ok(())
}
