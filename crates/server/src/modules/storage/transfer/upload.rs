use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::object::StorageObject;
use crate::modules::storage::catalog::object_repository::{find_object, mark_ready};
use crate::modules::storage::catalog::reservations::{Reservation, reserve};
use crate::modules::storage::object_store::object_key::ObjectKey;
use crate::modules::storage::object_store::r2_store::R2Store;
use crate::modules::storage::storage_error::StorageError;
use crate::modules::storage::transfer::file_input::FileInput;
use crate::modules::storage::transfer::signed_transfer::{SignedDownload, SignedUpload};
use crate::shared::http::api_error::ApiError;

pub struct StorageTransfer<'a> {
    pub pool: &'a PgPool,
    pub store: &'a R2Store,
}

impl StorageTransfer<'_> {
    pub async fn start(
        &self,
        caller: StorageCaller,
        request: (Uuid, &FileInput),
    ) -> Result<SignedUpload, ApiError> {
        let (bucket_id, input) = request;
        input.checked()?;
        self.store.require_healthy()?;
        let key = ObjectKey {
            tenant_id: caller.tenant_id,
            bucket_id,
            id: Uuid::new_v4(),
        };
        let started_at = OffsetDateTime::now_utc();
        let signed = self.store.sign_upload(input, (key, started_at)).await?;
        reserve(
            self.pool,
            caller,
            Reservation {
                key,
                input,
                expires_at: signed.expires_at,
                location: self.store.location(),
            },
        )
        .await?;

        Ok(signed)
    }

    pub async fn complete(
        &self,
        caller: StorageCaller,
        id: Uuid,
    ) -> Result<StorageObject, ApiError> {
        let record = find_object(self.pool, caller, id).await?;
        let object = record.object;

        if record.is_ready {
            return Ok(object);
        }

        if record.confirm_until <= OffsetDateTime::now_utc() {
            return Err(StorageError::UploadExpired.into());
        }

        self.store.require_location(record.location.as_deref())?;
        let key = ObjectKey {
            tenant_id: caller.tenant_id,
            bucket_id: object.bucket_id,
            id,
        };
        self.store
            .verify_upload(key, (object.size_bytes, &object.content_type))
            .await?;

        mark_ready(self.pool, caller, id).await
    }

    pub async fn download(
        &self,
        caller: StorageCaller,
        id: Uuid,
    ) -> Result<SignedDownload, ApiError> {
        let record = find_object(self.pool, caller, id).await?;

        if record.is_ready == false {
            return Err(StorageError::ObjectNotFound.into());
        }

        let key = ObjectKey {
            tenant_id: caller.tenant_id,
            bucket_id: record.object.bucket_id,
            id,
        };
        self.store.require_location(record.location.as_deref())?;
        self.store.require_healthy()?;
        self.store.sign_download(key).await
    }
}
