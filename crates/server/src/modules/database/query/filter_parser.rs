use crate::modules::database::query::condition::{Comparison, Filter, IsValue, Operation};
use crate::modules::database::query::query_names::parse_name;
use crate::modules::database::query::top_level_split::{split_top_level, unquote};
use crate::modules::database::rejection::database_rejection::DatabaseRejection;

const NEGATION_PREFIX: &str = "not.";
/// Bounds the size of `in.(...)` lists.
const MAX_IN_VALUES: usize = 500;

/// A filter from a query parameter: `age=gte.18` arrives as `("age", "gte.18")`.
pub fn parse_filter(column: &str, expression: &str) -> Result<Filter, DatabaseRejection> {
    let (is_negated, operation_text) = match expression.strip_prefix(NEGATION_PREFIX) {
        Some(rest) => (true, rest),
        None => (false, expression),
    };

    Ok(Filter {
        column: parse_name(column)?,
        is_negated,
        operation: parse_operation(operation_text)?,
    })
}

fn parse_operation(text: &str) -> Result<Operation, DatabaseRejection> {
    let (operator, value) = text.split_once('.').ok_or_else(|| {
        DatabaseRejection::invalid_query(format!("filter {text} must look like operator.value"))
    })?;
    let value = unquote(value)?;

    match operator {
        "eq" => Ok(Operation::Compare(Comparison::Equal, value)),
        "neq" => Ok(Operation::Compare(Comparison::NotEqual, value)),
        "gt" => Ok(Operation::Compare(Comparison::Greater, value)),
        "gte" => Ok(Operation::Compare(Comparison::GreaterOrEqual, value)),
        "lt" => Ok(Operation::Compare(Comparison::Less, value)),
        "lte" => Ok(Operation::Compare(Comparison::LessOrEqual, value)),
        "like" => Ok(Operation::Like(like_pattern(&value))),
        "ilike" => Ok(Operation::CaseInsensitiveLike(like_pattern(&value))),
        "in" => parse_in_list(&value).map(Operation::In),
        "is" => parse_is_value(&value).map(Operation::Is),
        "cs" => Ok(Operation::Contains(value)),
        "cd" => Ok(Operation::ContainedBy(value)),
        "ov" => Ok(Operation::Overlaps(value)),
        other => Err(DatabaseRejection::invalid_query(format!(
            "unknown filter operator {other}"
        ))),
    }
}

/// `*` is the URL-friendly wildcard (`%` would need escaping in URLs).
fn like_pattern(value: &str) -> String {
    value.replace('*', "%")
}

/// `(a,b,"c,d")`.
fn parse_in_list(value: &str) -> Result<Vec<String>, DatabaseRejection> {
    let inner = value
        .strip_prefix('(')
        .and_then(|rest| rest.strip_suffix(')'))
        .ok_or_else(|| DatabaseRejection::invalid_query("in needs a list like (a,b)"))?;
    // `in.()` matches no row, like an empty list in SQL.
    if inner.trim().is_empty() {
        return Ok(Vec::new());
    }

    let values: Vec<String> = split_top_level(inner)?
        .into_iter()
        .map(unquote)
        .collect::<Result<_, _>>()?;

    if values.len() > MAX_IN_VALUES {
        return Err(DatabaseRejection::invalid_query(
            "in lists take at most 500 values",
        ));
    }

    Ok(values)
}

fn parse_is_value(value: &str) -> Result<IsValue, DatabaseRejection> {
    match value {
        "null" => Ok(IsValue::Null),
        "true" => Ok(IsValue::True),
        "false" => Ok(IsValue::False),
        "unknown" => Ok(IsValue::Unknown),
        _ => Err(DatabaseRejection::invalid_query(
            "is takes null, true, false or unknown",
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_comparisons_and_negation() -> Result<(), DatabaseRejection> {
        let filter = parse_filter("age", "not.gte.18")?;

        assert!(filter.is_negated);
        assert_eq!(
            filter.operation,
            Operation::Compare(Comparison::GreaterOrEqual, "18".to_owned())
        );
        Ok(())
    }

    #[test]
    fn keeps_dots_inside_values() -> Result<(), DatabaseRejection> {
        let filter = parse_filter("email", "eq.ana.souza@example.com")?;

        assert_eq!(
            filter.operation,
            Operation::Compare(Comparison::Equal, "ana.souza@example.com".to_owned())
        );
        Ok(())
    }

    #[test]
    fn parses_lists_patterns_and_is() -> Result<(), DatabaseRejection> {
        let list = parse_filter("id", "in.(1,2,\"a,b\")")?;
        let pattern = parse_filter("name", "ilike.*ana*")?;
        let null = parse_filter("deleted_at", "is.null")?;

        assert_eq!(
            list.operation,
            Operation::In(vec!["1".to_owned(), "2".to_owned(), "a,b".to_owned()])
        );
        assert_eq!(
            pattern.operation,
            Operation::CaseInsensitiveLike("%ana%".to_owned())
        );
        assert_eq!(null.operation, Operation::Is(IsValue::Null));
        assert_eq!(
            parse_filter("id", "in.()")?.operation,
            Operation::In(Vec::new())
        );
        Ok(())
    }

    #[test]
    fn refuses_unknown_operators_and_values() {
        for (column, expression) in [
            ("a", "between.1"),
            ("a", "eq"),
            ("a", "is.maybe"),
            ("a", "in.1,2"),
            ("a;b", "eq.1"),
        ] {
            assert!(parse_filter(column, expression).is_err());
        }
    }
}
