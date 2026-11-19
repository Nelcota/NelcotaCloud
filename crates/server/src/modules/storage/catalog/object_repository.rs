use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::bucket_repository::lock_project;
use crate::modules::storage::catalog::object::{ObjectPage, ObjectRecord, StorageObject};
use crate::modules::storage::catalog::pagination::{PageCursor, PageInput};
use crate::modules::storage::catalog::quota::check_committed;
use crate::modules::storage::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

pub async fn list_objects(
    pool: &PgPool,
    caller: StorageCaller,
    target: (Uuid, PageInput),
) -> Result<ObjectPage, ApiError> {
    let (bucket, page) = target;
    let size = page.size()?;
    require_bucket(pool, caller.tenant_id, bucket).await?;
    let (timestamp, before) = resolve_cursor(pool, caller, (bucket, page.cursor()?)).await?;
    let items = sqlx::query_as(
        "SELECT id, bucket_id, name, content_type, size_bytes, created_at FROM storage_objects
         WHERE tenant_id = $1 AND bucket_id = $2 AND ($3::uuid IS NULL OR owner_id = $3)
             AND ($4::timestamptz IS NULL OR (created_at, id) < ($4, $5))
             AND is_ready ORDER BY created_at DESC, id DESC LIMIT $6",
    )
    .bind(caller.tenant_id)
    .bind(bucket)
    .bind(caller.owner_id)
    .bind(timestamp)
    .bind(before)
    .bind(size.saturating_add(1))
    .fetch_all(pool)
    .await?;

    Ok(PageInput::finish(items, size))
}

async fn resolve_cursor(
    pool: &PgPool,
    caller: StorageCaller,
    query: (Uuid, Option<PageCursor>),
) -> Result<(Option<OffsetDateTime>, Option<Uuid>), ApiError> {
    let (bucket, cursor) = query;
    let id = match cursor {
        None => return Ok((None, None)),
        Some(PageCursor::CreatedAt(timestamp, id)) => return Ok((Some(timestamp), Some(id))),
        Some(PageCursor::Legacy(id)) => id,
    };
    let timestamp = sqlx::query_scalar(
        "SELECT created_at FROM storage_objects WHERE tenant_id = $1 AND bucket_id = $2
            AND id = $3 AND ($4::uuid IS NULL OR owner_id = $4) AND is_ready",
    )
    .bind(caller.tenant_id)
    .bind(bucket)
    .bind(id)
    .bind(caller.owner_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::invalid_request("invalid storage page cursor"))?;

    Ok((Some(timestamp), Some(id)))
}

pub async fn find_object(
    pool: &PgPool,
    caller: StorageCaller,
    id: Uuid,
) -> Result<ObjectRecord, ApiError> {
    sqlx::query_as(
        "SELECT id, bucket_id, name, content_type, size_bytes, created_at, is_ready, confirm_until, location
         FROM storage_objects WHERE id = $1 AND tenant_id = $2
             AND ($3::uuid IS NULL OR owner_id = $3)",
    )
    .bind(id)
    .bind(caller.tenant_id)
    .bind(caller.owner_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| StorageError::ObjectNotFound.into())
}

pub async fn mark_ready(
    pool: &PgPool,
    caller: StorageCaller,
    id: Uuid,
) -> Result<StorageObject, ApiError> {
    let mut transaction = pool.begin().await?;
    lock_project(&mut transaction, caller.tenant_id).await?;
    let record: ObjectRecord = sqlx::query_as(
        "SELECT id, bucket_id, name, content_type, size_bytes, created_at, is_ready, confirm_until, location
         FROM storage_objects WHERE id = $1 AND tenant_id = $2
             AND ($3::uuid IS NULL OR owner_id = $3) FOR UPDATE",
    )
    .bind(id)
    .bind(caller.tenant_id)
    .bind(caller.owner_id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or(StorageError::ObjectNotFound)?;

    if record.is_ready {
        transaction.commit().await?;
        return Ok(record.object);
    }

    check_committed(&mut transaction, caller.tenant_id, record.object.size_bytes).await?;
    let object = sqlx::query_as(
        "UPDATE storage_objects SET is_ready = true, created_at = clock_timestamp()
         WHERE id = $1 AND confirm_until > clock_timestamp()
         RETURNING id, bucket_id, name, content_type, size_bytes, created_at",
    )
    .bind(id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or(StorageError::UploadExpired)?;
    transaction.commit().await?;

    Ok(object)
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

async fn require_bucket(pool: &PgPool, tenant: Uuid, bucket: Uuid) -> Result<(), ApiError> {
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (SELECT 1 FROM storage_buckets WHERE tenant_id = $1 AND id = $2)",
    )
    .bind(tenant)
    .bind(bucket)
    .fetch_one(pool)
    .await?;

    if exists == false {
        return Err(StorageError::BucketNotFound.into());
    }

    Ok(())
}
