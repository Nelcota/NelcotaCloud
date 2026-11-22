use super::r2_store::{DOWNLOAD_CACHE_CONTROL, R2Store, provider_failure};
use crate::modules::storage::catalog::object_key::ObjectKey;
use crate::modules::storage::rejection::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

impl R2Store {
    pub async fn verify_upload(
        &self,
        object: ObjectKey,
        expected: (i64, &str),
    ) -> Result<(), ApiError> {
        let head = self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(object.path())
            .send()
            .await;
        let metadata = match head {
            Ok(metadata) => metadata,
            Err(ref error)
                if error
                    .raw_response()
                    .is_some_and(|response| response.status().as_u16() == 404) =>
            {
                return Err(StorageError::UploadMissing.into());
            }
            Err(_) => return Err(provider_failure("verify upload")),
        };

        if (metadata.content_length(), metadata.content_type())
            != (Some(expected.0), Some(expected.1))
            || metadata.cache_control() != Some(DOWNLOAD_CACHE_CONTROL)
            || metadata.content_encoding().is_some()
            || metadata
                .content_disposition()
                .is_some_and(|value| value.starts_with("attachment;"))
                == false
        {
            return Err(StorageError::UploadMismatch.into());
        }

        Ok(())
    }
}
