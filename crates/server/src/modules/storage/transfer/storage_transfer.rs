use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::file_input::FileInput;
use crate::modules::storage::catalog::object::StorageObject;
use crate::modules::storage::catalog::object_key::ObjectKey;
use crate::modules::storage::catalog::object_repository::{find_object, mark_ready};
use crate::modules::storage::catalog::reservations::{Reservation, reserve};
use crate::modules::storage::object_store::UPLOAD_TTL;
use crate::modules::storage::object_store::r2_store::R2Store;
use crate::modules::storage::object_store::signed_download::SignedDownload;
use crate::modules::storage::object_store::signed_upload::SignedUpload;
use crate::modules::storage::rejection::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

pub struct StorageTransfer<'a> {
    pool: &'a PgPool,
    store: &'a R2Store,
}

impl<'a> StorageTransfer<'a> {
    pub fn new(pool: &'a PgPool, store: &'a R2Store) -> Self {
        Self { pool, store }
    }

    pub async fn start(
        &self,
        caller: StorageCaller,
        request: (Uuid, &FileInput),
    ) -> Result<SignedUpload, ApiError> {
        let (bucket_id, input) = request;
        input.checked()?;
        let key = ObjectKey {
            tenant_id: caller.tenant_id,
            bucket_id,
            id: Uuid::new_v4(),
        };
        let started_at = OffsetDateTime::now_utc();
        let reserved = reserve(
            self.pool,
            caller,
            Reservation {
                key,
                input,
                expires_at: started_at.saturating_add(UPLOAD_TTL),
            },
        )
        .await?;
        let key = ObjectKey {
            id: reserved.id,
            ..key
        };
        let started_at = reserved.expires_at.saturating_sub(UPLOAD_TTL);
        let mut signed = self.store.sign_upload(input, (key, started_at)).await?;
        signed.can_upload = reserved.can_upload;
        signed.verification_url = Some(self.store.sign_download(key).await?.url);

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

        if record.can_confirm == false {
            return Err(StorageError::UploadExpired.into());
        }

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
        self.store.sign_download(key).await
    }
}
