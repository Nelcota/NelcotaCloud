use std::collections::HashSet;

use aws_sdk_s3::types::{Delete, ObjectIdentifier};
use uuid::Uuid;

use crate::modules::storage::object_store::object_key::ObjectKey;
use crate::modules::storage::object_store::r2_store::R2Store;
use crate::modules::storage::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

impl R2Store {
    pub async fn delete_batch(&self, objects: &[ObjectKey]) -> Result<Vec<Uuid>, ApiError> {
        if objects.is_empty() {
            return Ok(Vec::new());
        }

        let keys: Vec<_> = objects
            .iter()
            .map(|object| (object.id, object.path()))
            .collect();
        let identifiers = keys
            .iter()
            .map(|(_, path)| ObjectIdentifier::builder().key(path).build())
            .collect::<Result<Vec<_>, _>>()
            .map_err(ApiError::internal)?;
        let batch = Delete::builder()
            .set_objects(Some(identifiers))
            .quiet(false)
            .build()
            .map_err(ApiError::internal)?;
        let response = self
            .client
            .delete_objects()
            .bucket(&self.bucket)
            .delete(batch)
            .send()
            .await
            .map_err(|error| {
                let status = error
                    .raw_response()
                    .map(|response| response.status().as_u16());
                tracing::warn!(?status, "object storage batch delete failed");
                StorageError::Unavailable
            })?;
        let removed: HashSet<_> = response
            .deleted()
            .iter()
            .filter_map(|entry| entry.key())
            .collect();

        Ok(keys
            .into_iter()
            .filter_map(|(id, path)| removed.contains(path.as_str()).then_some(id))
            .collect())
    }
}
