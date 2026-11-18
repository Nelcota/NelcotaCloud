use oauth2::url::form_urlencoded;

use crate::modules::database::query::condition::{Condition, GroupKind};
use crate::modules::database::query::filter_parser::parse_filter;
use crate::modules::database::query::logic_tree_parser::parse_logic_tree;
use crate::modules::database::query::order_parser::parse_order;
use crate::modules::database::query::query_names::parse_name;
use crate::modules::database::query::read_query::{EmbedPath, ReadQuery};
use crate::modules::database::query::select_parser::parse_select;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;

const ON_CONFLICT_PARAMETER: &str = "on_conflict";
/// Bounds the work one URL can ask for.
const MAX_PARAMETERS: usize = 100;
const MAX_PATH_DEPTH: usize = 3;

/// Parses the query string of a Data API request into a `ReadQuery`.
pub fn parse_query_string(query_string: &str) -> Result<ReadQuery, DatabaseRejection> {
    let mut query = ReadQuery::default();
    let parameters: Vec<(String, String)> = form_urlencoded::parse(query_string.as_bytes())
        .into_owned()
        .collect();

    if parameters.len() > MAX_PARAMETERS {
        return Err(DatabaseRejection::invalid_query(
            "too many query parameters",
        ));
    }

    for (key, value) in &parameters {
        apply_parameter(&mut query, key, value)?;
    }

    Ok(query)
}

/// `select`, then `[path.]order|limit|offset|or|and`, then `[path.]column` filters.
fn apply_parameter(query: &mut ReadQuery, key: &str, value: &str) -> Result<(), DatabaseRejection> {
    if key == "select" {
        query.select = Some(parse_select(value)?);
        return Ok(());
    }

    if key == ON_CONFLICT_PARAMETER {
        query.on_conflict = Some(parse_name_list(value)?);
        return Ok(());
    }

    let mut segments = key
        .split('.')
        .map(parse_name)
        .collect::<Result<Vec<_>, _>>()?;
    let Some(last) = segments.pop() else {
        return Err(DatabaseRejection::invalid_query("empty parameter name"));
    };

    if segments.len() > MAX_PATH_DEPTH {
        return Err(DatabaseRejection::invalid_query(
            "parameter path is too deep",
        ));
    }

    apply_to_node(query, segments, &last, value)
}

fn apply_to_node(
    query: &mut ReadQuery,
    path: EmbedPath,
    name: &str,
    value: &str,
) -> Result<(), DatabaseRejection> {
    let node = query.node_mut(path);

    match name {
        "order" => node.order = parse_order(value)?,
        "limit" => node.limit = Some(parse_count(name, value)?),
        "offset" => node.offset = Some(parse_count(name, value)?),
        "or" => node.conditions.push(logic_group(GroupKind::Or, value)?),
        "and" => node.conditions.push(logic_group(GroupKind::And, value)?),
        column => node
            .conditions
            .push(Condition::Filter(parse_filter(column, value)?)),
    }

    Ok(())
}

/// `on_conflict=email,tenant`: the unique columns an upsert matches on.
fn parse_name_list(value: &str) -> Result<Vec<String>, DatabaseRejection> {
    value.split(',').map(parse_name).collect()
}

fn logic_group(kind: GroupKind, value: &str) -> Result<Condition, DatabaseRejection> {
    parse_logic_tree(kind, false, value).map(Condition::Group)
}

fn parse_count(name: &str, value: &str) -> Result<u32, DatabaseRejection> {
    value
        .trim()
        .parse::<u32>()
        .map_err(|_| DatabaseRejection::invalid_query(format!("{name} must be a whole number")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn groups_parameters_by_embed_path() -> Result<(), DatabaseRejection> {
        let query = parse_query_string(
            "select=id,comments(body)&published=eq.true&comments.order=id.desc&comments.limit=5\
             &limit=20&offset=40&or=(a.eq.1,b.eq.2)",
        )?;
        let root = query.root().ok_or(DatabaseRejection::FilterRequired)?;
        let comments = query
            .node(&["comments".to_owned()])
            .ok_or(DatabaseRejection::FilterRequired)?;

        assert_eq!(root.conditions.len(), 2);
        assert_eq!(root.limit, Some(20));
        assert_eq!(root.offset, Some(40));
        assert_eq!(comments.limit, Some(5));
        assert_eq!(comments.order.len(), 1);
        assert!(query.select.is_some());
        Ok(())
    }

    #[test]
    fn decodes_percent_encoded_values() -> Result<(), DatabaseRejection> {
        let query = parse_query_string("title=eq.hello%20world&on_conflict=id")?;

        assert!(query.has_root_conditions());
        Ok(())
    }

    #[test]
    fn refuses_bad_counts_and_names() {
        for query_string in ["limit=-1", "offset=abc", "a;b=eq.1", "a.b.c.d.e=eq.1"] {
            assert!(parse_query_string(query_string).is_err(), "{query_string}");
        }
    }
}
