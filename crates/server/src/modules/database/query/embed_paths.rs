use std::collections::HashSet;

use crate::modules::database::query::read_query::{EmbedPath, ReadQuery};
use crate::modules::database::query::select_item::SelectItem;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;

/// Refuses filters, order or pages named after an embed the select does not have: they would
/// be silently ignored, and the client would get rows it meant to filter out.
pub fn ensure_known_paths(query: &ReadQuery) -> Result<(), DatabaseRejection> {
    let mut known = HashSet::new();

    if let Some(items) = &query.select {
        collect_embed_paths(items, &mut Vec::new(), &mut known);
    }

    for path in query.nodes.keys() {
        if path.is_empty() == false && known.contains(path) == false {
            return Err(DatabaseRejection::invalid_query(format!(
                "\"{}\" is not an embed of the select",
                path.join(".")
            )));
        }
    }

    Ok(())
}

fn collect_embed_paths(
    items: &[SelectItem],
    prefix: &mut EmbedPath,
    known: &mut HashSet<EmbedPath>,
) {
    for item in items {
        let SelectItem::Embed(embed) = item else {
            continue;
        };
        prefix.push(embed.key().to_owned());
        known.insert(prefix.clone());
        collect_embed_paths(&embed.items, prefix, known);
        prefix.pop();
    }
}

#[cfg(test)]
mod tests {
    use crate::modules::database::query::query_string_parser::parse_query_string;

    #[test]
    fn accepts_paths_of_selected_embeds() {
        let query_string = "select=id,author:users(name,teams(id))&author.teams.limit=1";

        assert!(parse_query_string(query_string).is_ok());
    }

    #[test]
    fn refuses_paths_the_select_does_not_embed() {
        for query_string in ["comments.id=eq.1", "select=id,users(id)&teams.limit=1"] {
            assert!(parse_query_string(query_string).is_err(), "{query_string}");
        }
    }
}
