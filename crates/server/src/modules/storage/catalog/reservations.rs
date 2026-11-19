use sqlx::{PgPool, PgTransaction};
use time::OffsetDateTime;

use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::bucket_repository::lock_project;
use crate::modules::storage::catalog::quota::check_pending;
use crate::modules::storage::object_store::object_key::ObjectKey;
use crate::modules::storage::storage_error::StorageError;
use crate::modules::storage::transfer::file_input::FileInput;
use crate::shared::http::api_error::ApiError;

pub const CONFIRMATION_WINDOW: time::Duration = time::Duration::minutes(15);

pub struct Reservation<'a> {
    pub key: ObjectKey,
    pub input: &'a FileInput,
    pub expires_at: OffsetDateTime,
    pub location: &'a str,
}

pub async fn reserve(
    pool: &PgPool,
    caller: StorageCaller,
    upload: Reservation<'_>,
) -> Result<(), ApiError> {
    let mut transaction = pool.begin().await?;
    lock_project(&mut transaction, caller.tenant_id).await?;
    bind_location(&mut transaction, caller, &upload).await?;
    check_pending(&mut transaction, caller, upload.input.size_bytes).await?;
    insert_reservation(&mut transaction, caller, upload).await?;
    transaction.commit().await?;

    Ok(())
}

async fn insert_reservation(
    transaction: &mut PgTransaction<'_>,
    caller: StorageCaller,
    upload: Reservation<'_>,
) -> Result<(), ApiError> {
    let Reservation {
        key,
        input,
        expires_at,
        location,
    } = upload;
    let confirm_until = expires_at.saturating_add(CONFIRMATION_WINDOW);
    let result = sqlx::query(
        "INSERT INTO storage_objects (id, tenant_id, bucket_id, owner_id, name, content_type,
            size_bytes, upload_expires_at, confirm_until, location)
         SELECT $1, tenant_id, id, $4, $5, $6, $7, $8, $9, $10 FROM storage_buckets
         WHERE tenant_id = $2 AND id = $3
             AND NOT EXISTS (SELECT 1 FROM storage_erased_users WHERE tenant_id = $2 AND user_id = $4)",
    )
    .bind(key.id)
    .bind(caller.tenant_id)
    .bind(key.bucket_id)
    .bind(caller.owner_id)
    .bind(&input.name)
    .bind(&input.content_type)
    .bind(input.size_bytes)
    .bind(expires_at)
    .bind(confirm_until)
    .bind(location)
    .execute(&mut **transaction)
    .await?;

    if result.rows_affected() == 0 {
        return Err(StorageError::ObjectNotFound.into());
    }

    Ok(())
}

async fn bind_location(
    transaction: &mut PgTransaction<'_>,
    caller: StorageCaller,
    upload: &Reservation<'_>,
) -> Result<(), ApiError> {
    let (current,) = sqlx::query_as::<_, (Option<String>,)>(
        "SELECT location FROM storage_buckets WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
    )
    .bind(caller.tenant_id)
    .bind(upload.key.bucket_id)
    .fetch_optional(&mut **transaction)
    .await?
    .ok_or(StorageError::BucketNotFound)?;

    match current.as_deref() {
        Some(location) if location == upload.location => return Ok(()),
        Some(_) => return Err(StorageError::LocationMismatch.into()),
        None => {}
    }

    let updated = sqlx::query(
        "UPDATE storage_buckets SET location = $3 WHERE tenant_id = $1 AND id = $2
         AND NOT EXISTS (SELECT 1 FROM storage_objects WHERE tenant_id = $1 AND bucket_id = $2)",
    )
    .bind(caller.tenant_id)
    .bind(upload.key.bucket_id)
    .bind(upload.location)
    .execute(&mut **transaction)
    .await?;

    if updated.rows_affected() == 0 {
        return Err(StorageError::LocationMismatch.into());
    }

    Ok(())
}
