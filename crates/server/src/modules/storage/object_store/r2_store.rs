use std::time::Duration;

use aws_sdk_s3::Client;
use aws_sdk_s3::config::timeout::TimeoutConfig;
use aws_sdk_s3::config::{BehaviorVersion, Credentials, Region, RequestChecksumCalculation};
use aws_sdk_s3::presigning::PresigningConfig;

use super::r2_config::R2Config;
use super::signed_download::SignedDownload;
use crate::modules::storage::catalog::object_key::ObjectKey;
use crate::modules::storage::rejection::storage_error::StorageError;
use crate::shared::http::api_error::ApiError;

const DOWNLOAD_TTL: Duration = Duration::from_secs(60);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
pub(super) const DOWNLOAD_CACHE_CONTROL: &str = "private, no-store";

#[derive(Clone)]
pub struct R2Store {
    pub(super) client: Client,
    pub(super) bucket: String,
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

        Self {
            client: Client::from_conf(client_config),
            bucket: config.bucket.to_owned(),
        }
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

    pub async fn delete(&self, object: ObjectKey) -> Result<(), ApiError> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(object.path())
            .send()
            .await
            .map_err(|_| provider_failure("delete object"))?;

        Ok(())
    }
}

pub(super) fn provider_failure(operation: &'static str) -> ApiError {
    tracing::warn!(operation, "object storage operation failed");
    StorageError::Unavailable.into()
}
