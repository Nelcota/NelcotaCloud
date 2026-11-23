use crate::modules::database::query::query_names::parse_name;
use crate::modules::database::query::top_level_split::split_top_level;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;

const MAX_ORDER_TERMS: usize = 10;

/// `created_at.desc.nullslast`.
#[derive(Debug, PartialEq, Eq)]
pub struct OrderTerm {
    pub column: String,
    pub is_descending: bool,
    pub nulls: Option<NullsPosition>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NullsPosition {
    First,
    Last,
}

/// `order=created_at.desc,title`.
pub fn parse_order(text: &str) -> Result<Vec<OrderTerm>, DatabaseRejection> {
    let terms = split_top_level(text)?;

    if terms.len() > MAX_ORDER_TERMS {
        return Err(DatabaseRejection::invalid_query(
            "order takes at most 10 columns",
        ));
    }

    terms.into_iter().map(parse_term).collect()
}

/// Preserve the order in which columns were sent, including repeated order parameters.
pub fn append_order(terms: &mut Vec<OrderTerm>, text: &str) -> Result<(), DatabaseRejection> {
    let added = parse_order(text)?;

    if terms.len().saturating_add(added.len()) > MAX_ORDER_TERMS {
        return Err(DatabaseRejection::invalid_query(
            "order takes at most 10 columns",
        ));
    }

    terms.extend(added);

    Ok(())
}

fn parse_term(text: &str) -> Result<OrderTerm, DatabaseRejection> {
    let mut parts = text.split('.');
    let column = parse_name(parts.next().unwrap_or_default())?;
    let mut term = OrderTerm {
        column,
        is_descending: false,
        nulls: None,
    };

    for modifier in parts {
        apply_modifier(&mut term, modifier)?;
    }

    Ok(term)
}

fn apply_modifier(term: &mut OrderTerm, modifier: &str) -> Result<(), DatabaseRejection> {
    match modifier {
        "asc" => term.is_descending = false,
        "desc" => term.is_descending = true,
        "nullsfirst" => term.nulls = Some(NullsPosition::First),
        "nullslast" => term.nulls = Some(NullsPosition::Last),
        other => {
            return Err(DatabaseRejection::invalid_query(format!(
                "unknown order modifier {other}"
            )));
        }
    }

    Ok(())
}

impl NullsPosition {
    pub fn sql_keyword(self) -> &'static str {
        match self {
            Self::First => " NULLS FIRST",
            Self::Last => " NULLS LAST",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_directions_and_nulls() -> Result<(), DatabaseRejection> {
        let terms = parse_order("created_at.desc.nullslast,title")?;

        assert_eq!(
            terms,
            vec![
                OrderTerm {
                    column: "created_at".to_owned(),
                    is_descending: true,
                    nulls: Some(NullsPosition::Last),
                },
                OrderTerm {
                    column: "title".to_owned(),
                    is_descending: false,
                    nulls: None,
                },
            ]
        );
        Ok(())
    }

    #[test]
    fn refuses_unknown_modifiers() {
        assert!(parse_order("title.sideways").is_err());
        assert!(parse_order("").is_err());
    }
}
