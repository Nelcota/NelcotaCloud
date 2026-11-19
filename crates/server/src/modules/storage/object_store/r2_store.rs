use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use std::time::Duration;

use aws_sdk_s3::Client;
use aws_sdk_s3::config::timeout::TimeoutConfig;
use aws_sdk_s3::config::{BehaviorVersion, Credentials, Region, RequestChecksumCalculation};
use aws_sdk_s3::presigning::{PresignedRequest, PresigningConfig};
use percent_encoding::{NON_ALPHANUMERIC, utf8_percent_encode};
use time::OffsetDateTime;

use crate::modules::storage::catalog::reservations::CONFIRMATION_WINDOW;
use crate::modules::storage::object_store::object_key::ObjectKey;
use crate::modules::storage::object_store::r2_config::R2Config;
use crate::modules::storage::storage_error::StorageError;
use crate::modules::storage::transfer::file_input::FileInput;
use crate::modules::storage::transfer::signed_transfer::{SignedDownload, SignedUpload};
use crate::shared::http::api_error::ApiError;

pub const UPLOAD_TTL: time::Duration = time::Duration::minutes(5);
const DOWNLOAD_TTL: Duration = Duration::from_secs(60);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
const DOWNLOAD_CACHE_CONTROL: &str = "private, no-store";

#[derive(Clone)]
pub struct R2Store {
    pub(super) client: Client,
    pub(super) bucket: String,
    pub(super) healthy: Arc<AtomicBool>,
    location: String,
}

impl R2Store {
    pub fn new(config: &R2Config<'_>) -> Self {
        let credentials = Credentials::new(
            config.access_key_id,
            config.secret_access_key,
            None,
            None,
            "r2",
        );
        let timeouts = TimeoutConfig::builder()
            .operation_timeout(REQUEST_TIMEOUT)
            .build();
        let client_config = aws_sdk_s3::Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new("auto"))
            .endpoint_url(config.endpoint)
            .credentials_provider(credentials)
            .force_path_style(true)
            .request_checksum_calculation(RequestChecksumCalculation::WhenRequired)
            .timeout_config(timeouts)
            .build();

        let origin = config.endpoint.trim_end_matches('/').to_ascii_lowercase();

        Self {
            client: Client::from_conf(client_config),
            bucket: config.bucket.to_owned(),
            healthy: Arc::new(AtomicBool::new(false)),
            location: format!("{origin}/{}", config.bucket),
        }
    }

    pub fn location(&self) -> &str {
        &self.location
    }

    pub fn require_location(&self, location: Option<&str>) -> Result<(), ApiError> {
        if location != Some(self.location()) {
            return Err(StorageError::LocationMismatch.into());
        }

        Ok(())
    }

    pub async fn sign_upload(
        &self,
        input: &FileInput,
        target: (ObjectKey, OffsetDateTime),
    ) -> Result<SignedUpload, ApiError> {
        let (object, started_at) = target;
        let signing = PresigningConfig::builder()
            .start_time(started_at.into())
            .expires_in(UPLOAD_TTL.unsigned_abs())
            .build()
            .map_err(ApiError::internal)?;
        let signed = self
            .client
            .put_object()
            .bucket(&self.bucket)
            .key(object.path())
            .if_none_match("*")
            .content_length(input.size_bytes)
            .content_type(&input.content_type)
            .content_disposition(attachment(&input.name))
            .cache_control(DOWNLOAD_CACHE_CONTROL)
            .presigned(signing)
            .await
            .map_err(|_| provider_failure("sign upload"))?;

        checked_upload(&signed, target)
    }

    pub async fn sign_download(&self, object: ObjectKey) -> Result<SignedDownload, ApiError> {
        let signing = PresigningConfig::expires_in(DOWNLOAD_TTL).map_err(ApiError::internal)?;
        let signed = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(object.path())
            .presigned(signing)
            .await
            .map_err(|_| provider_failure("sign download"))?;

        Ok(SignedDownload {
            url: signed.uri().to_owned(),
        })
    }

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

fn checked_upload(
    signed: &PresignedRequest,
    target: (ObjectKey, OffsetDateTime),
) -> Result<SignedUpload, ApiError> {
    let (object, started_at) = target;
    let url = Url::parse(signed.uri()).map_err(|_| provider_failure("parse upload URL"))?;
    let (_, signed_headers) = url
        .query_pairs()
        .find(|(name, _)| name == "X-Amz-SignedHeaders")
        .ok_or_else(|| provider_failure("check upload signature"))?;
    let required = [
        "if-none-match",
        "content-length",
        "content-type",
        "content-disposition",
        "cache-control",
    ];

    for header in required {
        if signed_headers.split(';').any(|name| name == header) == false {
            return Err(provider_failure("check required upload header"));
        }
    }

    let expires_at = started_at.saturating_add(UPLOAD_TTL);

    Ok(SignedUpload {
        object_id: object.id,
        url: signed.uri().to_owned(),
        expires_at,
        confirm_until: expires_at.saturating_add(CONFIRMATION_WINDOW),
        headers: signed
            .headers()
            .filter(|(name, _)| *name != "host")
            .map(|(name, value)| (name.to_owned(), value.to_owned()))
            .collect(),
    })
}

fn attachment(name: &str) -> String {
    let encoded = utf8_percent_encode(name, NON_ALPHANUMERIC);
    format!("attachment; filename*=UTF-8''{encoded}")
}

fn provider_failure(operation: &'static str) -> ApiError {
    tracing::warn!(operation, "object storage operation failed");
    StorageError::Unavailable.into()
}

use url::Url;

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[tokio::test]
    async fn put_signature_requires_the_create_only_precondition_and_exact_length()
    -> Result<(), ApiError> {
        let store = R2Store::new(&R2Config {
            endpoint: "https://example.r2.cloudflarestorage.com",
            bucket: "test-files",
            access_key_id: "test-key",
            secret_access_key: "test-secret",
        });
        let input = FileInput {
            name: "Résumé 2026.pdf".to_owned(),
            content_type: "application/pdf".to_owned(),
            size_bytes: 123,
        };
        let key = ObjectKey {
            tenant_id: Uuid::new_v4(),
            bucket_id: Uuid::new_v4(),
            id: Uuid::new_v4(),
        };
        let signed = store
            .sign_upload(&input, (key, OffsetDateTime::now_utc()))
            .await?;

        assert_eq!(
            signed.headers.get("if-none-match").map(String::as_str),
            Some("*")
        );
        assert_eq!(
            signed.headers.get("content-length").map(String::as_str),
            Some("123")
        );
        assert!(signed.url.contains(&key.path()));
        Ok(())
    }
}
