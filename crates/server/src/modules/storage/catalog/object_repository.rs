use sqlx::PgPool;
use uuid::Uuid;

use super::bucket_repository::require_bucket;
use super::reservations::CONFIRMATION_GRACE_SECONDS;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::object::StorageObject;
use crate::modules::storage::catalog::object_page::ObjectPage;
use crate::modules::storage::catalog::object_record::ObjectRecord;
use crate::modules::storage::catalog::pagination::PageInput;
use crate::modules::storage::rejection::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

pub async fn list_objects(
    pool: &PgPool,
    caller: StorageCaller,
    target: (Uuid, PageInput),
) -> Result<ObjectPage, ApiError> {
    let (bucket, page) = target;
    let size = page.size()?;
    require_bucket(pool, caller.tenant_id, bucket).await?;
    let items = sqlx::query_as(
        "SELECT id, bucket_id, name, content_type, size_bytes FROM storage_objects
         WHERE tenant_id = $1 AND bucket_id = $2 AND ($3::uuid IS NULL OR owner_id = $3)
             AND ($4::uuid IS NULL OR id < $4) AND is_ready ORDER BY id DESC LIMIT $5",
    )
    .bind(caller.tenant_id)
    .bind(bucket)
    .bind(caller.owner_id)
    .bind(page.before)
    .bind(size.saturating_add(1))
    .fetch_all(pool)
    .await?;

    Ok(PageInput::finish(items, size))
}

pub async fn find_object(
    pool: &PgPool,
    caller: StorageCaller,
    id: Uuid,
) -> Result<ObjectRecord, ApiError> {
    sqlx::query_as(
        "SELECT id, bucket_id, name, content_type, size_bytes, is_ready,
             upload_expires_at > now() - make_interval(secs => $4) AS can_confirm
         FROM storage_objects WHERE id = $1 AND tenant_id = $2
             AND ($3::uuid IS NULL OR owner_id = $3)",
    )
    .bind(id)
    .bind(caller.tenant_id)
    .bind(caller.owner_id)
    .bind(CONFIRMATION_GRACE_SECONDS)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| StorageError::ObjectNotFound.into())
}

pub async fn mark_ready(
    pool: &PgPool,
    caller: StorageCaller,
    id: Uuid,
) -> Result<StorageObject, ApiError> {
    sqlx::query_as(
        "UPDATE storage_objects SET is_ready = true WHERE id = $1 AND tenant_id = $2
             AND ($3::uuid IS NULL OR owner_id = $3)
             AND (is_ready OR upload_expires_at > now() - make_interval(secs => $4))
         RETURNING id, bucket_id, name, content_type, size_bytes",
    )
    .bind(id)
    .bind(caller.tenant_id)
    .bind(caller.owner_id)
    .bind(CONFIRMATION_GRACE_SECONDS)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| StorageError::UploadExpired.into())
}

pub async fn delete_object(pool: &PgPool, caller: StorageCaller, id: Uuid) -> Result<(), ApiError> {
    let removed = sqlx::query(
        "DELETE FROM storage_objects WHERE id = $1 AND tenant_id = $2
         AND ($3::uuid IS NULL OR owner_id = $3)",
    )
    .bind(id)
    .bind(caller.tenant_id)
    .bind(caller.owner_id)
    .execute(pool)
    .await?;

    if removed.rows_affected() == 0 {
        return Err(StorageError::ObjectNotFound.into());
    }

    Ok(())
}
