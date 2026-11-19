use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;
use validator::{Validate, ValidationError};

use crate::shared::http::api_error::ApiError;

const MAX_KEY_BYTES: usize = 256;
const MAX_VALUE_BYTES: usize = 64 * 1024;
const DEFAULT_TTL_SECONDS: u64 = 300;
const MAX_TTL_SECONDS: u64 = 3_600;
pub const MAX_BODY_BYTES: usize = 128 * 1024;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(deny_unknown_fields)]
pub struct CacheKeyRequest {
    /// Nonblank key of up to 256 UTF-8 bytes.
    #[validate(custom(function = "validate_key"))]
    pub key: String,
}

#[derive(Deserialize, ToSchema, Validate)]
#[serde(deny_unknown_fields)]
pub struct CacheWriteRequest {
    /// Nonblank key of up to 256 UTF-8 bytes.
    #[validate(custom(function = "validate_key"))]
    pub key: String,
    #[schema(value_type = Value)]
    /// JSON value. Its serialized representation can be up to 64 KiB.
    pub value: Value,
    #[validate(range(min = 1, max = "MAX_TTL_SECONDS"))]
    #[schema(minimum = 1, maximum = 3600, default = 300)]
    pub ttl_seconds: Option<u64>,
}

impl CacheWriteRequest {
    pub fn encode_value(&self) -> Result<Vec<u8>, ApiError> {
        let bytes = serde_json::to_vec(&self.value).map_err(ApiError::internal)?;

        if bytes.len() > MAX_VALUE_BYTES {
            return Err(ApiError::PayloadTooLarge);
        }

        Ok(bytes)
    }

    pub fn ttl_seconds(&self) -> u64 {
        self.ttl_seconds.unwrap_or(DEFAULT_TTL_SECONDS)
    }
}

#[derive(Serialize, ToSchema)]
pub struct CacheEntry {
    #[schema(value_type = Value, required = true)]
    pub value: Value,
}

fn validate_key(key: &str) -> Result<(), ValidationError> {
    if key.trim().is_empty() || key.len() > MAX_KEY_BYTES || key.chars().any(char::is_control) {
        let mut error = ValidationError::new("invalid_cache_key");
        error.message = Some(
            "key must be nonblank, at most 256 bytes and contain no control characters".into(),
        );
        return Err(error);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn validates_key_length_and_contents() {
        for key in [" ".to_owned(), "a\n".to_owned(), "é".repeat(129)] {
            assert!(validate_key(&key).is_err());
        }

        assert!(validate_key(&"é".repeat(128)).is_ok());
    }

    #[test]
    fn enforces_value_size_and_ttl() -> Result<(), ApiError> {
        let mut request = CacheWriteRequest {
            key: "key".to_owned(),
            value: json!("x".repeat(MAX_VALUE_BYTES - 2)),
            ttl_seconds: None,
        };
        assert_eq!(request.ttl_seconds(), DEFAULT_TTL_SECONDS);
        assert_eq!(request.encode_value()?.len(), MAX_VALUE_BYTES);
        request.value = json!("x".repeat(MAX_VALUE_BYTES - 1));
        assert!(matches!(
            request.encode_value(),
            Err(ApiError::PayloadTooLarge)
        ));

        for ttl in [0, MAX_TTL_SECONDS + 1] {
            request.ttl_seconds = Some(ttl);
            assert!(request.validate().is_err());
        }

        request.ttl_seconds = Some(MAX_TTL_SECONDS);
        assert!(request.validate().is_ok());
        Ok(())
    }
}
