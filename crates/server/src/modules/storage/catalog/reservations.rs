use sqlx::{PgPool, PgTransaction};
use time::OffsetDateTime;
use uuid::Uuid;

use super::project_lock::lock_project;
use super::write_admission::admit_write;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::file_input::FileInput;
use crate::modules::storage::catalog::object_key::ObjectKey;
use crate::modules::storage::rejection::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

const PROJECT_BYTES: i64 = 1024 * 1024 * 1024;
const MAX_OBJECTS: i64 = 10_000;
pub const CONFIRMATION_GRACE_SECONDS: f64 = 15.0 * 60.0;

pub struct ReservedUpload {
    pub id: Uuid,
    pub expires_at: OffsetDateTime,
    pub can_upload: bool,
}

pub async fn reserve(
    pool: &PgPool,
    caller: StorageCaller,
    upload: Reservation<'_>,
) -> Result<ReservedUpload, ApiError> {
    let _permit = admit_write(caller.tenant_id).await?;
    let mut transaction = pool.begin().await?;
    lock_project(&mut transaction, caller.tenant_id).await?;

    if let Some(request_id) = upload.input.request_id
        && let Some(existing) =
            find_reservation(&mut transaction, caller, &upload, request_id).await?
    {
        transaction.commit().await?;
        return Ok(existing);
    }

    check_quota(&mut transaction, caller.tenant_id, upload.input.size_bytes).await?;
    insert_reservation(&mut transaction, caller, &upload).await?;
    transaction.commit().await?;

    Ok(ReservedUpload {
        id: upload.key.id,
        expires_at: upload.expires_at,
        can_upload: true,
    })
}

pub struct Reservation<'a> {
    pub key: ObjectKey,
    pub input: &'a FileInput,
    pub expires_at: OffsetDateTime,
}

async fn insert_reservation(
    transaction: &mut PgTransaction<'_>,
    caller: StorageCaller,
    upload: &Reservation<'_>,
) -> Result<(), ApiError> {
    let Reservation {
        key,
        input,
        expires_at,
    } = upload;
    let result = sqlx::query(
        "INSERT INTO storage_objects (
            id, tenant_id, bucket_id, owner_id, name, content_type, size_bytes, upload_expires_at, request_id
         )
         SELECT $1, tenant_id, id, $4, $5, $6, $7, $8, $9 FROM storage_buckets
         WHERE tenant_id = $2 AND id = $3 FOR KEY SHARE",
    )
    .bind(key.id)
    .bind(caller.tenant_id)
    .bind(key.bucket_id)
    .bind(caller.owner_id)
    .bind(&input.name)
    .bind(&input.content_type)
    .bind(input.size_bytes)
    .bind(*expires_at)
    .bind(input.request_id)
    .execute(&mut **transaction)
    .await?;

    if result.rows_affected() == 0 {
        return Err(StorageError::BucketNotFound.into());
    }

    Ok(())
}

#[derive(sqlx::FromRow)]
struct ExistingReservation {
    id: Uuid,
    expires_at: OffsetDateTime,
    matches_file: bool,
    can_upload: bool,
    can_confirm: bool,
}

async fn find_reservation(
    transaction: &mut PgTransaction<'_>,
    caller: StorageCaller,
    upload: &Reservation<'_>,
    request_id: Uuid,
) -> Result<Option<ReservedUpload>, ApiError> {
    let existing: Option<ExistingReservation> = sqlx::query_as(
        "SELECT id, upload_expires_at AS expires_at,
             (name, content_type, size_bytes) = ($5, $6, $7) AS matches_file,
             NOT is_ready AND upload_expires_at > now() AS can_upload,
             is_ready OR upload_expires_at > now() - make_interval(secs => $8) AS can_confirm
         FROM storage_objects WHERE tenant_id = $1 AND bucket_id = $2
             AND owner_id IS NOT DISTINCT FROM $3 AND request_id = $4",
    )
    .bind(caller.tenant_id)
    .bind(upload.key.bucket_id)
    .bind(caller.owner_id)
    .bind(request_id)
    .bind(&upload.input.name)
    .bind(&upload.input.content_type)
    .bind(upload.input.size_bytes)
    .bind(CONFIRMATION_GRACE_SECONDS)
    .fetch_optional(&mut **transaction)
    .await?;
    let Some(existing) = existing else {
        return Ok(None);
    };

    if existing.matches_file == false {
        return Err(StorageError::UploadRequestConflict.into());
    }

    if existing.can_confirm == false {
        return Err(StorageError::UploadExpired.into());
    }

    Ok(Some(ReservedUpload {
        id: existing.id,
        expires_at: existing.expires_at,
        can_upload: existing.can_upload,
    }))
}

async fn check_quota(
    transaction: &mut PgTransaction<'_>,
    tenant_id: Uuid,
    size_bytes: i64,
) -> Result<(), ApiError> {
    let (count, bytes) = sqlx::query_as::<_, (i64, i64)>(
        "SELECT count(*), COALESCE(sum(size_bytes), 0)::bigint FROM (
            SELECT size_bytes FROM storage_objects WHERE tenant_id = $1
            UNION ALL SELECT size_bytes FROM storage_object_deletions WHERE tenant_id = $1
        ) charged",
    )
    .bind(tenant_id)
    .fetch_one(&mut **transaction)
    .await?;

    if count >= MAX_OBJECTS || bytes.saturating_add(size_bytes) > PROJECT_BYTES {
        return Err(StorageError::QuotaExceeded.into());
    }

    Ok(())
}
