use serde_json::{Map, Value};
use validator::ValidationError;

/// A metadata document: always a JSON object, never an array or a scalar.
pub type MetadataObject = Map<String, Value>;

/// Profile data stays small enough to come back with every user read.
const USER_METADATA_MAX_BYTES: usize = 16 * 1024;
/// Copied into every access token, so it must keep tokens short enough for HTTP headers.
const APP_METADATA_MAX_BYTES: usize = 4 * 1024;

pub fn check_user_metadata_size(metadata: &MetadataObject) -> Result<(), ValidationError> {
    check_size(metadata, USER_METADATA_MAX_BYTES)
}

pub fn check_app_metadata_size(metadata: &MetadataObject) -> Result<(), ValidationError> {
    check_size(metadata, APP_METADATA_MAX_BYTES)
}

fn check_size(metadata: &MetadataObject, max_bytes: usize) -> Result<(), ValidationError> {
    let serialized = serde_json::to_vec(metadata)
        .map_err(|_| ValidationError::new("metadata_not_serializable"))?;

    if serialized.len() > max_bytes {
        let message = format!("metadata must take at most {max_bytes} bytes as JSON");
        return Err(ValidationError::new("metadata_too_large").with_message(message.into()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn metadata_of(text_length: usize) -> MetadataObject {
        let mut metadata = MetadataObject::new();
        metadata.insert("text".to_owned(), json!("a".repeat(text_length)));

        metadata
    }

    #[test]
    fn accepts_empty_metadata() {
        assert!(check_user_metadata_size(&MetadataObject::new()).is_ok());
        assert!(check_app_metadata_size(&MetadataObject::new()).is_ok());
    }

    #[test]
    fn accepts_metadata_at_the_limit() {
        // `{"text":"…"}` adds 11 bytes around the text.
        let at_limit = metadata_of(APP_METADATA_MAX_BYTES - 11);

        assert!(check_app_metadata_size(&at_limit).is_ok());
    }

    #[test]
    fn refuses_metadata_over_the_limit() {
        let over_limit = metadata_of(APP_METADATA_MAX_BYTES - 10);

        assert!(check_app_metadata_size(&over_limit).is_err());
        assert!(check_user_metadata_size(&over_limit).is_ok());
        assert!(check_user_metadata_size(&metadata_of(USER_METADATA_MAX_BYTES)).is_err());
    }
}
