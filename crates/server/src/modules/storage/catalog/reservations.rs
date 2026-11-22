use sqlx::{PgPool, PgTransaction};
use time::OffsetDateTime;
use uuid::Uuid;

use super::project_lock::{begin_catalog_write, catalog_write_error};
use super::write_admission::admit_write;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::file_input::FileInput;
use crate::modules::storage::catalog::object_key::ObjectKey;
use crate::modules::storage::rejection::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

pub const PROJECT_BYTES: i64 = 1024 * 1024 * 1024;
pub const MAX_OBJECTS: i64 = 10_000;
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
    let mut transaction = begin_catalog_write(pool, caller.tenant_id).await?;

    if let Some(request_id) = upload.input.request_id
        && let Some(existing) =
            find_reservation(&mut transaction, caller, &upload, request_id).await?
    {
        transaction.commit().await?;
        return Ok(existing);
    }

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
    // This statement takes its snapshot after acquiring the catalog lock. Both live objects
    // and pending deletions are charged before inserting the reservation.
    let (allowed, inserted): (bool, bool) = sqlx::query_as(
        "WITH quota AS (
             SELECT count(*) < $10
                AND COALESCE(sum(size_bytes), 0) + $7::bigint <= $11::bigint AS allowed
             FROM (
                 SELECT size_bytes FROM storage_objects WHERE tenant_id = $2
                 UNION ALL SELECT size_bytes FROM storage_object_deletions WHERE tenant_id = $2
             ) charged
         ), inserted AS (
             INSERT INTO storage_objects (
                 id, tenant_id, bucket_id, owner_id, name, content_type,
                 size_bytes, upload_expires_at, request_id
             )
             SELECT $1, bucket.tenant_id, bucket.id, $4, $5, $6, $7, $8, $9
             FROM storage_buckets AS bucket CROSS JOIN quota
             WHERE bucket.tenant_id = $2 AND bucket.id = $3 AND quota.allowed
             FOR KEY SHARE OF bucket
             RETURNING id
         )
         SELECT allowed, EXISTS (SELECT 1 FROM inserted) FROM quota",
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
    .bind(MAX_OBJECTS)
    .bind(PROJECT_BYTES)
    .fetch_one(&mut **transaction)
    .await
    .map_err(catalog_write_error)?;

    if allowed == false {
        return Err(StorageError::QuotaExceeded.into());
    }

    if inserted == false {
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
    .await
    .map_err(catalog_write_error)?;
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
