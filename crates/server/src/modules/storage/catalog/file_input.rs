use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::{Validate, ValidationError};

use crate::shared::http::api_error::ApiError;

pub const MAX_FILE_BYTES: i64 = 25 * 1024 * 1024;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(deny_unknown_fields)]
pub struct FileInput {
    #[validate(custom(function = "validate_name"))]
    pub name: String,
    #[validate(custom(function = "validate_content_type"))]
    pub content_type: String,
    #[validate(range(min = 0, max = "MAX_FILE_BYTES"))]
    pub size_bytes: i64,
    /// Reuse this ID to retry the same upload in this bucket.
    pub request_id: Option<Uuid>,
}

impl FileInput {
    pub fn checked(&self) -> Result<(), ApiError> {
        if self.size_bytes > MAX_FILE_BYTES {
            return Err(ApiError::PayloadTooLarge);
        }

        self.validate().map_err(ApiError::invalid_request)
    }
}

fn validate_name(name: &str) -> Result<(), ValidationError> {
    if name.trim().is_empty()
        || name.len() > 255
        || name == "."
        || name == ".."
        || name
            .chars()
            .any(|character| character.is_control() || matches!(character, '/' | '\\'))
    {
        return Err(ValidationError::new("invalid_file_name"));
    }

    Ok(())
}

fn validate_content_type(content_type: &str) -> Result<(), ValidationError> {
    let valid = |token: &str| {
        token.is_empty() == false
            && token
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || b"!#$&^_.+-".contains(&byte))
    };

    if content_type.len() > 127
        || content_type
            .split_once('/')
            .is_some_and(|(kind, subtype)| valid(kind) && valid(subtype))
            == false
    {
        return Err(ValidationError::new("invalid_content_type"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_unicode_names_and_rejects_paths_and_control_characters() {
        assert!(validate_name("Guia de instalação.pdf").is_ok());
        for name in [
            "",
            " ",
            ".",
            "..",
            "folder/file",
            "folder\\file",
            "file\r\n",
        ] {
            assert!(validate_name(name).is_err());
        }
    }

    #[test]
    fn validates_a_bare_media_type() {
        assert!(validate_content_type("application/vnd.example+json").is_ok());
        for content_type in [
            "",
            "text",
            "/html",
            "text/html; charset=utf-8",
            "text//html",
        ] {
            assert!(validate_content_type(content_type).is_err());
        }
    }

    #[test]
    fn rejects_out_of_range_sizes() {
        let mut input = FileInput {
            name: "file.txt".to_owned(),
            content_type: "text/plain".to_owned(),
            size_bytes: -1,
            request_id: None,
        };
        assert!(input.checked().is_err());
        input.size_bytes = 0;
        assert!(input.checked().is_ok());
        input.size_bytes = i64::MAX;
        assert!(matches!(input.checked(), Err(ApiError::PayloadTooLarge)));
    }
}
