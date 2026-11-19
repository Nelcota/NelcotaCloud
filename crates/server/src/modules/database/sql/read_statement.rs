use sqlx::{Postgres, QueryBuilder};

use crate::modules::database::query::read_query::ReadQuery;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::schema_model::{SchemaModel, TableModel};
use crate::modules::database::sql::select_writer::{Level, LevelMode, SelectWriter};
use crate::shared::database::sql_identifier::quote_identifier;

pub const ROOT_ALIAS: &str = "t0";
/// Largest JSON body the database may aggregate for a response.
pub const MAX_RESPONSE_BYTES: usize = 16 * 1024 * 1024;

/// What a read answers besides the rows.
#[derive(Clone, Copy, PartialEq, Eq)]
pub struct ReadShape {
    /// Counts every matching row (ignoring the page) in the same statement.
    pub counts_exactly: bool,
    /// Answers the first row as an object instead of an array.
    pub is_single_object: bool,
}

/// The statement of a read: one row with the JSON body built by Postgres, the number of rows
/// in it and, when asked, the total.
pub fn read_statement(
    schema: &SchemaModel,
    query: &ReadQuery,
    table: &TableModel,
    shape: ReadShape,
) -> Result<QueryBuilder<Postgres>, DatabaseRejection> {
    let root = table_level(table, query, ROOT_ALIAS);
    let mut sql = QueryBuilder::new("WITH ");
    push_json_rows(&mut sql, SelectWriter::new(schema, query), &root, shape)?;

    Ok(sql)
}

/// `EXPLAIN` of the count: the planner's estimate, without reading the rows.
pub fn planned_count_statement(
    schema: &SchemaModel,
    query: &ReadQuery,
    table: &TableModel,
) -> Result<QueryBuilder<Postgres>, DatabaseRejection> {
    let root = table_level(table, query, ROOT_ALIAS);
    let mut sql = QueryBuilder::new("EXPLAIN (FORMAT JSON) ");
    SelectWriter::new(schema, query).push_level(&mut sql, &root, LevelMode::Count)?;

    Ok(sql)
}

/// Check the encoded row sizes before asking Postgres to assemble one JSON value.
pub fn push_json_rows<'a>(
    sql: &mut QueryBuilder<Postgres>,
    mut writer: SelectWriter<'a>,
    root: &Level<'a>,
    shape: ReadShape,
) -> Result<(), DatabaseRejection> {
    let body = match shape.is_single_object {
        true => "coalesce((SELECT value::text FROM _encoded_rows LIMIT 1), 'null')",
        false => "(SELECT coalesce(json_agg(value), '[]')::text FROM _encoded_rows)",
    };
    sql.push("_encoded_rows AS MATERIALIZED (SELECT row_to_json(_r) AS value FROM (");
    writer.push_level(sql, root, LevelMode::Rows)?;
    sql.push(") _r) ");
    sql.push(format!(
        "SELECT CASE WHEN coalesce(sum(octet_length(value::text)::bigint + 2), 0)::bigint \
         <= {MAX_RESPONSE_BYTES} THEN {body} END, count(*) AS row_count, "
    ));

    match shape.counts_exactly {
        true => {
            let mut count_writer = SelectWriter::new(writer.schema, writer.query);
            sql.push("(SELECT count(*) FROM (");
            count_writer.push_level(sql, root, LevelMode::Count)?;
            sql.push(") _c)");
        }
        false => {
            sql.push("NULL::bigint");
        }
    }

    sql.push(" AS total FROM _encoded_rows");

    Ok(())
}

/// The requested table, read from `public`.
pub fn table_level<'a>(table: &'a TableModel, query: &'a ReadQuery, alias: &str) -> Level<'a> {
    Level {
        table,
        items: query.select.as_deref(),
        path: Vec::new(),
        source: format!("public.{}", quote_identifier(&table.name)),
        alias: alias.to_owned(),
        link: Vec::new(),
        applies_filters: true,
    }
}
