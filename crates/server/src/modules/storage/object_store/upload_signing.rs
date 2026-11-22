use aws_sdk_s3::presigning::{PresignedRequest, PresigningConfig};
use percent_encoding::{NON_ALPHANUMERIC, utf8_percent_encode};
use time::{Duration, OffsetDateTime};
use url::Url;

use super::r2_store::{DOWNLOAD_CACHE_CONTROL, R2Store, provider_failure};
use super::signed_upload::SignedUpload;
use crate::modules::storage::catalog::file_input::FileInput;
use crate::modules::storage::catalog::object_key::ObjectKey;
use crate::shared::http::api_error::ApiError;

pub const UPLOAD_TTL: Duration = Duration::minutes(5);

impl R2Store {
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

    Ok(SignedUpload {
        object_id: object.id,
        url: signed.uri().to_owned(),
        expires_at: started_at.saturating_add(UPLOAD_TTL),
        headers: signed
            .headers()
            .filter(|(name, _)| *name != "host")
            .map(|(name, value)| (name.to_owned(), value.to_owned()))
            .collect(),
        can_upload: true,
        verification_url: None,
    })
}

fn attachment(name: &str) -> String {
    let encoded = utf8_percent_encode(name, NON_ALPHANUMERIC);
    format!("attachment; filename*=UTF-8''{encoded}")
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::*;
    use crate::modules::storage::object_store::r2_config::R2Config;

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
            request_id: None,
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
