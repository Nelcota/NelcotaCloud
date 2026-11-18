use crate::modules::database::admin::table_definition::column_type::ColumnType;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::shared::database::sql_identifier::quote_literal;

/// Defaults written as expressions (in any letter case); any other default is written as a
/// quoted literal, which Postgres converts to the column's type.
const DEFAULT_EXPRESSIONS: [&str; 7] = [
    "now()",
    "gen_random_uuid()",
    "auth.uid()",
    "current_date",
    "current_timestamp",
    "true",
    "false",
];
/// Postgres reads these date and time literals once, when the table is created: the column
/// would default to that fixed moment instead of the time of each insert.
const FROZEN_TIME_WORDS: [&str; 4] = ["now", "today", "tomorrow", "yesterday"];

/// The SQL after `DEFAULT`, from what the console sent.
pub fn default_sql(default: &str, column_type: &ColumnType) -> Result<String, DatabaseRejection> {
    let trimmed = default.trim();

    if trimmed.is_empty() {
        return Err(DatabaseRejection::invalid_query(
            "default must not be blank: leave it out for no default",
        ));
    }

    let lowercase = trimmed.to_ascii_lowercase();

    if DEFAULT_EXPRESSIONS.contains(&lowercase.as_str()) {
        return Ok(lowercase);
    }

    if column_type.is_date_or_time() && FROZEN_TIME_WORDS.contains(&lowercase.as_str()) {
        return Err(DatabaseRejection::invalid_query(
            "use now() or current_date: this word would fix the default at creation time",
        ));
    }

    Ok(quote_literal(trimmed))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn type_of(name: &str) -> Result<ColumnType, Box<dyn std::error::Error>> {
        Ok(ColumnType::parse(name)?)
    }

    #[test]
    fn writes_expressions_in_any_case_and_trimmed_literals()
    -> Result<(), Box<dyn std::error::Error>> {
        let timestamp = type_of("timestamptz")?;
        let integer = type_of("integer")?;

        assert_eq!(default_sql(" NOW() ", &timestamp)?, "now()");
        assert_eq!(
            default_sql("CURRENT_TIMESTAMP", &timestamp)?,
            "current_timestamp"
        );
        assert_eq!(default_sql(" 5 ", &integer)?, "'5'");
        Ok(())
    }

    #[test]
    fn refuses_blank_defaults_and_frozen_times() -> Result<(), Box<dyn std::error::Error>> {
        let timestamp = type_of("timestamptz")?;
        let text = type_of("text")?;

        assert!(default_sql("   ", &text).is_err());
        assert!(default_sql("today", &timestamp).is_err());
        assert!(default_sql("today", &text).is_ok());
        Ok(())
    }
}
