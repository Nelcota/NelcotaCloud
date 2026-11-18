use crate::modules::database::rejection::database_rejection::DatabaseRejection;

/// Postgres truncates identifiers longer than this.
const MAX_NAME_BYTES: usize = 63;

/// A table, column, relation or function name from the URL. It is only looked up in the schema
/// (and quoted when written), but refusing odd characters early gives clearer errors.
pub fn parse_name(text: &str) -> Result<String, DatabaseRejection> {
    let name = text.trim();

    if is_valid_name(name, |character| {
        character.is_alphanumeric() || matches!(character, '_' | '$' | '-')
    }) == false
    {
        return Err(DatabaseRejection::invalid_query(format!(
            "invalid name {name}"
        )));
    }

    Ok(name.to_owned())
}

/// A key the client picks for the response; letters, digits and underscores only.
pub fn parse_alias(text: &str) -> Result<String, DatabaseRejection> {
    let alias = text.trim();

    if is_valid_name(alias, |character| {
        character.is_ascii_alphanumeric() || character == '_'
    }) == false
    {
        return Err(DatabaseRejection::invalid_query(format!(
            "invalid alias {alias}"
        )));
    }

    Ok(alias.to_owned())
}

fn is_valid_name(name: &str, is_allowed: impl Fn(char) -> bool) -> bool {
    if name.is_empty() || name.len() > MAX_NAME_BYTES {
        return false;
    }

    name.chars().all(is_allowed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_ordinary_names() -> Result<(), DatabaseRejection> {
        assert_eq!(parse_name(" created_at ")?, "created_at");
        assert_eq!(parse_name("preço")?, "preço");
        assert_eq!(parse_alias("total_2")?, "total_2");
        Ok(())
    }

    #[test]
    fn refuses_names_with_sql_characters_or_too_long() {
        let too_long = "a".repeat(64);

        for name in ["", "a;b", "a\"b", "a b", too_long.as_str()] {
            assert!(parse_name(name).is_err(), "{name} should be refused");
        }

        assert!(parse_alias("a-b").is_err());
    }
}
