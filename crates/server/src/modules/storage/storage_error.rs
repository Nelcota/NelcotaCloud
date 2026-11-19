use axum::http::StatusCode;

use crate::shared::http::api_error::{ApiError, Rejection};

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("storage is not configured")]
    Unavailable,
    #[error("the project or bucket does not exist")]
    BucketNotFound,
    #[error("the file does not exist")]
    ObjectNotFound,
    #[error("a bucket with this name already exists")]
    DuplicateBucket,
    #[error("the project has reached the storage bucket limit")]
    BucketLimit,
    #[error("the project has reached its storage quota")]
    QuotaExceeded,
    #[error("the pending upload limit has been reached")]
    PendingQuotaExceeded,
    #[error("the storage bucket is bound to a different or unknown location")]
    LocationMismatch,
    #[error("the upload has expired")]
    UploadExpired,
    #[error("the uploaded file has not arrived")]
    UploadMissing,
    #[error("the uploaded file does not match the declared size and content type")]
    UploadMismatch,
}

impl From<StorageError> for ApiError {
    fn from(error: StorageError) -> Self {
        let (status, code) = match error {
            StorageError::Unavailable => (StatusCode::SERVICE_UNAVAILABLE, "storage_unavailable"),
            StorageError::BucketNotFound => (StatusCode::NOT_FOUND, "storage_bucket_not_found"),
            StorageError::ObjectNotFound => (StatusCode::NOT_FOUND, "storage_object_not_found"),
            StorageError::DuplicateBucket => (StatusCode::CONFLICT, "storage_bucket_exists"),
            StorageError::BucketLimit => (StatusCode::CONFLICT, "storage_bucket_limit"),
            StorageError::QuotaExceeded => (StatusCode::CONFLICT, "storage_quota_exceeded"),
            StorageError::PendingQuotaExceeded => (
                StatusCode::TOO_MANY_REQUESTS,
                "storage_pending_quota_exceeded",
            ),
            StorageError::LocationMismatch => {
                (StatusCode::SERVICE_UNAVAILABLE, "storage_location_mismatch")
            }
            StorageError::UploadExpired => (StatusCode::CONFLICT, "storage_upload_expired"),
            StorageError::UploadMissing => (StatusCode::CONFLICT, "storage_upload_missing"),
            StorageError::UploadMismatch => (StatusCode::CONFLICT, "storage_upload_mismatch"),
        };

        Self::Rejected(Rejection {
            status,
            code,
            message: error.to_string(),
        })
    }
}
