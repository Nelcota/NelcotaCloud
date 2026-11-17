use crate::modules::database::query::query_names::{parse_alias, parse_name};
use crate::modules::database::query::select_item::{
    CastType, ColumnSelection, EmbedSelection, SelectItem,
};
use crate::modules::database::query::top_level_split::split_top_level;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;

/// Embeds inside embeds; deeper trees would multiply the work of one request.
const MAX_EMBED_DEPTH: usize = 3;
const INNER_MODIFIER: &str = "inner";
const LEFT_MODIFIER: &str = "left";

/// Parses `select=id,title,author:users(name),comments(*)`.
pub fn parse_select(text: &str) -> Result<Vec<SelectItem>, DatabaseRejection> {
    parse_items(text, 0)
}

fn parse_items(text: &str, depth: usize) -> Result<Vec<SelectItem>, DatabaseRejection> {
    if depth > MAX_EMBED_DEPTH {
        return Err(DatabaseRejection::invalid_query(
            "embeds are nested too deeply",
        ));
    }

    split_top_level(text)?
        .into_iter()
        .map(|item| parse_item(item, depth))
        .collect()
}

fn parse_item(text: &str, depth: usize) -> Result<SelectItem, DatabaseRejection> {
    if text == "*" {
        return Ok(SelectItem::AllColumns);
    }

    if let Some((head, rest)) = text.split_once('(') {
        return parse_embed(head, rest, depth).map(SelectItem::Embed);
    }

    parse_column(text).map(SelectItem::Column)
}

/// `alias:name::cast`.
fn parse_column(text: &str) -> Result<ColumnSelection, DatabaseRejection> {
    let (target, cast) = match text.split_once("::") {
        Some((target, cast_name)) => (target, Some(parse_cast(cast_name)?)),
        None => (text, None),
    };
    let (alias, name) = split_alias(target)?;

    Ok(ColumnSelection {
        name: parse_name(name)?,
        alias,
        cast,
    })
}

fn parse_cast(name: &str) -> Result<CastType, DatabaseRejection> {
    CastType::parse(name.trim())
        .ok_or_else(|| DatabaseRejection::invalid_query(format!("unsupported cast {name}")))
}

/// `alias:relation!hint!inner` followed by `items)`.
fn parse_embed(head: &str, rest: &str, depth: usize) -> Result<EmbedSelection, DatabaseRejection> {
    let Some(inner_items) = rest.strip_suffix(')') else {
        return Err(DatabaseRejection::invalid_query("an embed must end with )"));
    };
    let (alias, target) = split_alias(head)?;
    let mut modifiers = target.split('!');
    let relation = parse_name(modifiers.next().unwrap_or_default())?;
    let mut embed = EmbedSelection {
        relation,
        alias,
        hint: None,
        is_inner: false,
        items: parse_items(inner_items, depth.saturating_add(1))?,
    };

    for modifier in modifiers {
        apply_modifier(&mut embed, modifier)?;
    }

    Ok(embed)
}

fn apply_modifier(embed: &mut EmbedSelection, modifier: &str) -> Result<(), DatabaseRejection> {
    match modifier {
        INNER_MODIFIER => embed.is_inner = true,
        LEFT_MODIFIER => embed.is_inner = false,
        hint => embed.hint = Some(parse_name(hint)?),
    }

    Ok(())
}

fn split_alias(text: &str) -> Result<(Option<String>, &str), DatabaseRejection> {
    let Some((alias, target)) = text.split_once(':') else {
        return Ok((None, text.trim()));
    };

    Ok((Some(parse_alias(alias)?), target.trim()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn column(name: &str) -> SelectItem {
        SelectItem::Column(ColumnSelection {
            name: name.to_owned(),
            alias: None,
            cast: None,
        })
    }

    #[test]
    fn parses_columns_aliases_and_casts() -> Result<(), DatabaseRejection> {
        let items = parse_select("*,id,price_text:price::text")?;

        assert_eq!(
            items,
            vec![
                SelectItem::AllColumns,
                column("id"),
                SelectItem::Column(ColumnSelection {
                    name: "price".to_owned(),
                    alias: Some("price_text".to_owned()),
                    cast: Some(CastType::Text),
                }),
            ]
        );
        Ok(())
    }

    #[test]
    fn parses_nested_embeds_with_hints() -> Result<(), DatabaseRejection> {
        let items = parse_select("id,writer:users!posts_author_fkey!inner(name,teams(id))")?;
        let Some(SelectItem::Embed(embed)) = items.get(1) else {
            return Err(DatabaseRejection::invalid_query("expected an embed"));
        };

        assert_eq!(embed.relation, "users");
        assert_eq!(embed.key(), "writer");
        assert_eq!(embed.hint.as_deref(), Some("posts_author_fkey"));
        assert!(embed.is_inner);
        assert_eq!(embed.items.len(), 2);
        Ok(())
    }

    #[test]
    fn refuses_bad_select_lists() {
        for text in [
            "id::regclass",
            "a(b(c(d(e(f)))))",
            "users(name",
            "bad alias!:id",
            "id;drop",
        ] {
            assert!(parse_select(text).is_err(), "{text} should be refused");
        }
    }
}
