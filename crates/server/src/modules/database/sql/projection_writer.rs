use sqlx::{Postgres, QueryBuilder};

use crate::modules::database::query::select_item::{ColumnSelection, SelectItem};
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::sql::condition_writer::AliasedTable;
use crate::modules::database::sql::embed_writer::EmbedPlan;
use crate::shared::database::sql_identifier::quote_identifier;

/// `t0.*, t0."price"::text AS "price_text", e1.value AS "author"`.
pub fn push_projection(
    sql: &mut QueryBuilder<Postgres>,
    target: AliasedTable,
    items: Option<&[SelectItem]>,
    embeds: &[EmbedPlan],
) -> Result<(), DatabaseRejection> {
    let items = match items {
        Some(items) => items,
        None => {
            sql.push(format!("{}.*", target.alias));
            return Ok(());
        }
    };
    let mut embeds = embeds.iter();

    for (index, item) in items.iter().enumerate() {
        if index > 0 {
            sql.push(", ");
        }

        let expression = match item {
            SelectItem::AllColumns => format!("{}.*", target.alias),
            SelectItem::Column(selection) => column_expression(target, selection)?,
            SelectItem::Embed(selection) => {
                let embed = embeds
                    .next()
                    .ok_or_else(|| DatabaseRejection::invalid_query("embed was not planned"))?;
                let key = quote_identifier(selection.key());
                format!("{}.value AS {key}", embed.lateral_alias)
            }
        };
        sql.push(expression);
    }

    Ok(())
}

fn column_expression(
    target: AliasedTable,
    selection: &ColumnSelection,
) -> Result<String, DatabaseRejection> {
    let (column_sql, _) = target.column_sql(&selection.name)?;
    let cast = selection
        .cast
        .map(|cast| format!("::{}", cast.sql_name()))
        .unwrap_or_default();
    let key = quote_identifier(selection.key());

    Ok(format!("{column_sql}{cast} AS {key}"))
}
