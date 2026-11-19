use sqlx::{Postgres, QueryBuilder};

use crate::modules::database::query::select_item::{EmbedSelection, SelectItem};
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::junction::Junction;
use crate::modules::database::schema::relationship::{Relationship, find_relationship};
use crate::modules::database::sql::read_statement::MAX_RESPONSE_BYTES;
use crate::modules::database::sql::select_writer::{Level, LevelMode, SelectWriter};
use crate::shared::database::sql_identifier::quote_identifier;

/// An embed with its relationship resolved and its aliases chosen.
pub struct EmbedPlan<'a> {
    pub selection: &'a EmbedSelection,
    pub relationship: Relationship<'a>,
    pub lateral_alias: String,
}

/// Embeds: related tables written as `LATERAL` subqueries that build their JSON in Postgres.
impl<'a> SelectWriter<'a> {
    pub(super) fn plan_embeds(
        &mut self,
        level: &Level<'a>,
    ) -> Result<Vec<EmbedPlan<'a>>, DatabaseRejection> {
        let selections = level
            .items
            .unwrap_or_default()
            .iter()
            .filter_map(|item| match item {
                SelectItem::Embed(selection) => Some(selection),
                _ => None,
            });
        let mut plans = Vec::new();

        for selection in selections {
            let relationship = find_relationship(
                self.schema,
                &level.table.name,
                &selection.relation,
                selection.hint.as_deref(),
            )?;
            plans.push(EmbedPlan {
                selection,
                relationship,
                lateral_alias: self.take_alias("e"),
            });
        }

        Ok(plans)
    }

    /// `LEFT JOIN LATERAL (SELECT <json> AS value FROM (<child>) s) e ON ...`.
    pub(super) fn push_embed_join(
        &mut self,
        sql: &mut QueryBuilder<Postgres>,
        parent: &Level<'a>,
        embed: &EmbedPlan<'a>,
    ) -> Result<(), DatabaseRejection> {
        let relationship = &embed.relationship;
        let selection = embed.selection;
        let lateral_alias = &embed.lateral_alias;
        let row_alias = self.take_alias("s");
        let child_alias = self.take_alias("t");
        let junction_alias = self.take_alias("j");
        let join = match selection.is_inner {
            true => " INNER",
            false => " LEFT",
        };
        let mut path = parent.path.clone();
        path.push(selection.key().to_owned());
        let child = Level {
            table: relationship.target,
            items: Some(&selection.items),
            path,
            source: format!("public.{}", quote_identifier(&relationship.target.name)),
            link: link_conditions(
                relationship,
                &LinkAliases {
                    parent: &parent.alias,
                    child: &child_alias,
                    junction: &junction_alias,
                },
            ),
            alias: child_alias,
            applies_filters: true,
        };

        sql.push(format!("{join} JOIN LATERAL ("));
        if relationship.is_to_many {
            sql.push(format!(
                "WITH _encoded_children AS MATERIALIZED (SELECT row_to_json({row_alias}) AS value FROM ("
            ));
        }

        if relationship.is_to_many == false {
            sql.push(format!("SELECT row_to_json({row_alias}) AS value FROM ("));
        }

        self.push_level(sql, &child, LevelMode::Rows)?;
        sql.push(format!(") {row_alias}"));
        if relationship.is_to_many {
            sql.push(format!(
                ") SELECT CASE WHEN auth.check_json_response_size(\
                 coalesce(sum(octet_length(value::text)::bigint + 2), 0)::bigint, {MAX_RESPONSE_BYTES}) \
                 THEN (SELECT coalesce(json_agg(value), '[]') FROM _encoded_children) END AS value \
                 FROM _encoded_children"
            ));
        }

        sql.push(format!(") {lateral_alias} ON "));
        match selection.is_inner && relationship.is_to_many {
            true => sql.push(format!("json_array_length({lateral_alias}.value) > 0")),
            false => sql.push("true"),
        };

        Ok(())
    }
}

/// Table aliases a link condition refers to.
struct LinkAliases<'a> {
    parent: &'a str,
    child: &'a str,
    junction: &'a str,
}

/// `t2."post_id" = t1."id"` for each column pair of the relationship, or an `EXISTS` on the
/// junction table for many-to-many.
fn link_conditions(relationship: &Relationship, aliases: &LinkAliases) -> Vec<String> {
    if let Some(junction) = &relationship.junction {
        return vec![junction_condition(junction, aliases)];
    }

    let parent_alias = aliases.parent;
    let child_alias = aliases.child;

    relationship
        .column_pairs
        .iter()
        .map(|(parent_column, child_column)| {
            format!(
                "{child_alias}.{} = {parent_alias}.{}",
                quote_identifier(child_column),
                quote_identifier(parent_column)
            )
        })
        .collect()
}

/// `EXISTS (SELECT 1 FROM public."post_tags" j3 WHERE j3."tag_id" = t2."id" AND
/// j3."post_id" = t1."id")`.
fn junction_condition(junction: &Junction, aliases: &LinkAliases) -> String {
    let alias = aliases.junction;
    let to_child = junction
        .target_pairs
        .iter()
        .map(|(junction_column, child_column)| (aliases.child, *junction_column, *child_column));
    let to_parent = junction
        .parent_pairs
        .iter()
        .map(|(junction_column, parent_column)| (aliases.parent, *junction_column, *parent_column));
    let equalities = to_child
        .chain(to_parent)
        .map(|(other_alias, junction_column, other_column)| {
            format!(
                "{alias}.{} = {other_alias}.{}",
                quote_identifier(junction_column),
                quote_identifier(other_column)
            )
        })
        .collect::<Vec<_>>()
        .join(" AND ");

    format!(
        "EXISTS (SELECT 1 FROM public.{} {alias} WHERE {equalities})",
        quote_identifier(junction.table)
    )
}
