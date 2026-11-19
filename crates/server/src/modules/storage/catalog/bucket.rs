use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::{Validate, ValidationError};

#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct Bucket {
    pub id: Uuid,
    pub name: String,
}

#[derive(Deserialize, ToSchema, Validate)]
#[serde(deny_unknown_fields)]
pub struct BucketInput {
    #[validate(custom(function = "check_name"))]
    pub name: String,
}

fn check_name(name: &str) -> Result<(), ValidationError> {
    if (1..=63).contains(&name.len()) == false
        || name.starts_with('-')
        || name.ends_with('-')
        || name
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
            == false
    {
        return Err(ValidationError::new("invalid_storage_bucket_name"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn logical_bucket_names_allow_lowercase_letters_digits_and_internal_hyphens() {
        assert!(check_name("docs-1").is_ok());
        for name in ["", "MyBucket", "one/two", "-one", "two-", "two_name"] {
            assert!(check_name(name).is_err());
        }
    }
}
