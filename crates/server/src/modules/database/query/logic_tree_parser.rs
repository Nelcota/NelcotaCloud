use crate::modules::database::query::condition::{Condition, ConditionGroup, GroupKind};
use crate::modules::database::query::filter_parser::parse_filter;
use crate::modules::database::query::top_level_split::split_top_level;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;

const MAX_GROUP_DEPTH: usize = 5;
const NEGATION_PREFIX: &str = "not.";

/// `or=(age.lt.18,and(name.eq.ana,active.is.true))`: the value of an `or` / `and` parameter.
pub fn parse_logic_tree(
    kind: GroupKind,
    is_negated: bool,
    text: &str,
) -> Result<ConditionGroup, DatabaseRejection> {
    parse_group(kind, is_negated, text, 0)
}

fn parse_group(
    kind: GroupKind,
    is_negated: bool,
    text: &str,
    depth: usize,
) -> Result<ConditionGroup, DatabaseRejection> {
    if depth > MAX_GROUP_DEPTH {
        return Err(DatabaseRejection::invalid_query(
            "logic groups nested too deeply",
        ));
    }

    let Some(inner) = text
        .strip_prefix('(')
        .and_then(|rest| rest.strip_suffix(')'))
    else {
        return Err(DatabaseRejection::invalid_query(
            "and/or take a list like (a.eq.1,b.eq.2)",
        ));
    };
    let conditions = split_top_level(inner)?
        .into_iter()
        .map(|item| parse_member(item, depth))
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ConditionGroup {
        kind,
        is_negated,
        conditions,
    })
}

/// A member is a nested group (`and(...)`, `not.or(...)`) or a filter (`age.gt.18`).
fn parse_member(text: &str, depth: usize) -> Result<Condition, DatabaseRejection> {
    let (is_negated, body) = match text.strip_prefix(NEGATION_PREFIX) {
        Some(rest) => (true, rest),
        None => (false, text),
    };

    if let Some(group_text) = body.strip_prefix("and")
        && group_text.starts_with('(')
    {
        let next_depth = depth.saturating_add(1);
        return parse_group(GroupKind::And, is_negated, group_text, next_depth)
            .map(Condition::Group);
    }

    if let Some(group_text) = body.strip_prefix("or")
        && group_text.starts_with('(')
    {
        let next_depth = depth.saturating_add(1);
        return parse_group(GroupKind::Or, is_negated, group_text, next_depth)
            .map(Condition::Group);
    }

    let Some((column, expression)) = text.split_once('.') else {
        return Err(DatabaseRejection::invalid_query(format!(
            "{text} must look like column.operator.value"
        )));
    };

    parse_filter(column, expression).map(Condition::Filter)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_nested_groups() -> Result<(), DatabaseRejection> {
        let group = parse_logic_tree(
            GroupKind::Or,
            false,
            "(age.lt.18,not.and(name.eq.ana,active.is.true),score.not.eq.3)",
        )?;

        assert_eq!(group.conditions.len(), 3);
        let Some(Condition::Group(nested)) = group.conditions.get(1) else {
            return Err(DatabaseRejection::invalid_query("expected a group"));
        };
        assert!(nested.is_negated);
        assert_eq!(nested.kind, GroupKind::And);
        let Some(Condition::Filter(filter)) = group.conditions.get(2) else {
            return Err(DatabaseRejection::invalid_query("expected a filter"));
        };
        assert!(filter.is_negated);
        Ok(())
    }

    #[test]
    fn a_column_named_like_a_keyword_is_still_a_filter() -> Result<(), DatabaseRejection> {
        let group = parse_logic_tree(GroupKind::And, false, "(order_id.eq.1,andrew.eq.2)")?;

        assert_eq!(group.conditions.len(), 2);
        Ok(())
    }

    #[test]
    fn refuses_malformed_trees() {
        for text in ["a.eq.1", "()", "(a)", "(and(a.eq.1)", "(x.eq.1,)"] {
            assert!(
                parse_logic_tree(GroupKind::Or, false, text).is_err(),
                "{text}"
            );
        }
    }
}
