use sqlx::PgTransaction;
use uuid::Uuid;

use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

const PROJECT_BYTES: i64 = 1024 * 1024 * 1024;
const MAX_PROJECT_OBJECTS: i64 = 10_000;
const PROJECT_PENDING_BYTES: i64 = 256 * 1024 * 1024;
const MAX_PROJECT_PENDING: i64 = 64;
const USER_PENDING_BYTES: i64 = 64 * 1024 * 1024;
const MAX_USER_PENDING: i64 = 4;

pub async fn check_pending(
    transaction: &mut PgTransaction<'_>,
    caller: StorageCaller,
    bytes: i64,
) -> Result<(), ApiError> {
    let (project_count, project_bytes, owner_count, owner_bytes) = sqlx::query_as::<_, (i64, i64, i64, i64)>(
        "SELECT count(*), COALESCE(sum(size_bytes), 0)::bigint,
            count(*) FILTER (WHERE owner_id IS NOT DISTINCT FROM $2),
            COALESCE(sum(size_bytes) FILTER (WHERE owner_id IS NOT DISTINCT FROM $2), 0)::bigint
         FROM (
            SELECT owner_id, size_bytes FROM storage_objects WHERE tenant_id = $1 AND NOT is_ready
            UNION ALL
            SELECT owner_id, size_bytes FROM storage_object_deletions WHERE tenant_id = $1 AND NOT was_ready
         ) pending",
    )
    .bind(caller.tenant_id)
    .bind(caller.owner_id)
    .fetch_one(&mut **transaction)
    .await?;

    if project_count >= MAX_PROJECT_PENDING
        || project_bytes.saturating_add(bytes) > PROJECT_PENDING_BYTES
    {
        return Err(StorageError::PendingQuotaExceeded.into());
    }

    if caller.owner_id.is_some()
        && (owner_count >= MAX_USER_PENDING
            || owner_bytes.saturating_add(bytes) > USER_PENDING_BYTES)
    {
        return Err(StorageError::PendingQuotaExceeded.into());
    }

    Ok(())
}

pub async fn check_committed(
    transaction: &mut PgTransaction<'_>,
    tenant: Uuid,
    bytes: i64,
) -> Result<(), ApiError> {
    let (count, total) = sqlx::query_as::<_, (i64, i64)>(
        "SELECT count(*), COALESCE(sum(size_bytes), 0)::bigint FROM (
            SELECT size_bytes FROM storage_objects WHERE tenant_id = $1 AND is_ready
            UNION ALL
            SELECT size_bytes FROM storage_object_deletions WHERE tenant_id = $1 AND was_ready
         ) committed",
    )
    .bind(tenant)
    .fetch_one(&mut **transaction)
    .await?;

    if count >= MAX_PROJECT_OBJECTS || total.saturating_add(bytes) > PROJECT_BYTES {
        return Err(StorageError::QuotaExceeded.into());
    }

    Ok(())
}
