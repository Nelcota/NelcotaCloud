use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use validator::{Validate, ValidationError};

use crate::shared::text::not_blank::check_not_blank;

const MAX_VERSION: i64 = 9_007_199_254_740_991;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(deny_unknown_fields)]
pub struct MigrationRequest {
    /// Positive integer prefix of the SQL file, unique in the project.
    #[validate(range(min = 1, max = MAX_VERSION))]
    #[schema(minimum = 1, maximum = 9007199254740991_f64)]
    pub version: i64,
    /// File name without its version prefix or extension.
    #[validate(length(min = 1, max = 100), custom(function = "validate_name"))]
    #[schema(min_length = 1, max_length = 100, pattern = "^[a-z0-9_-]+$")]
    pub name: String,
    /// Exact file contents. The checksum includes whitespace and line endings.
    #[validate(length(min = 1, max = 100000), custom(function = "validate_sql"))]
    #[schema(min_length = 1, max_length = 100000)]
    pub sql: String,
}

#[derive(Deserialize, IntoParams, Validate)]
#[into_params(parameter_in = Query)]
pub struct MigrationHistoryQuery {
    /// Pass the previous page's `next_before` to fetch older versions.
    #[validate(range(min = 1, max = MAX_VERSION))]
    #[param(minimum = 1, maximum = 9007199254740991_f64)]
    pub before: Option<i64>,
}

fn validate_name(name: &str) -> Result<(), ValidationError> {
    if name.bytes().all(|byte| {
        byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'_' | b'-')
    }) {
        return Ok(());
    }

    Err(ValidationError::new("invalid_migration_name")
        .with_message("use lowercase ASCII letters, digits, hyphens, and underscores".into()))
}

fn validate_sql(sql: &str) -> Result<(), ValidationError> {
    check_not_blank(sql)?;

    if sql.contains('\0') {
        return Err(ValidationError::new("invalid_migration_sql")
            .with_message("SQL must not contain NUL characters".into()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checks_request_bounds_and_formats() {
        let mut request = MigrationRequest {
            version: MAX_VERSION,
            name: "create_todos-2".to_owned(),
            sql: "SELECT 1".to_owned(),
        };
        assert!(request.validate().is_ok());

        request.version = MAX_VERSION + 1;
        request.name = "../todos.sql".to_owned();
        request.sql = " ".to_owned();
        assert!(matches!(request.validate(), Err(errors) if errors.field_errors().len() == 3));
        assert!(validate_sql("SELECT 1\0").is_err());
    }
}
