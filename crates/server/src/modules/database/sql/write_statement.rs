use sqlx::{Postgres, QueryBuilder};

use crate::modules::database::query::read_query::ReadQuery;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::schema_model::{SchemaModel, TableModel};
use crate::modules::database::sql::read_statement::{ROOT_ALIAS, ReadShape, push_json_rows};
use crate::modules::database::sql::select_writer::{Level, SelectWriter};
use crate::modules::database::sql::write_change::WriteChange;
use crate::modules::database::sql::write_target::WriteTarget;

const WRITTEN_ROWS: &str = "_m";

/// A write without returning rows (`RETURNING` would also require read access to them): one
/// statement per insert batch, or the single `UPDATE` / `DELETE`.
pub fn write_statements(
    table: &TableModel,
    query: &ReadQuery,
    change: &WriteChange,
) -> Result<Vec<QueryBuilder<Postgres>>, DatabaseRejection> {
    let target = WriteTarget::new(table);

    match change {
        WriteChange::Insert(batches) => Ok(batches
            .iter()
            .map(|batch| {
                let mut sql = QueryBuilder::new("");
                target.push_insert(&mut sql, batch);
                sql
            })
            .collect()),
        WriteChange::Update(values) => {
            let mut sql = QueryBuilder::new("");
            target.push_update(&mut sql, values, query)?;
            Ok(vec![sql])
        }
        WriteChange::Delete => {
            let mut sql = QueryBuilder::new("");
            target.push_delete(&mut sql, query)?;
            Ok(vec![sql])
        }
    }
}

/// Writes answering the written rows, shaped by `select` like a read.
///
/// One statement per insert batch (in order, so a later batch sees the rows of an earlier one), or the single
/// `WITH _m AS (<write> RETURNING t0.*) SELECT <json> FROM (<rows of _m>) _r`.
pub fn write_returning_statements(
    schema: &SchemaModel,
    table: &TableModel,
    query: &ReadQuery,
    change: &WriteChange,
) -> Result<Vec<QueryBuilder<Postgres>>, DatabaseRejection> {
    let target = WriteTarget::new(table);
    let start = || QueryBuilder::new(format!("WITH {WRITTEN_ROWS} AS ("));
    let mut statements = Vec::new();

    match change {
        WriteChange::Insert(batches) => {
            for batch in batches {
                let mut sql = start();
                target.push_insert(&mut sql, batch);
                statements.push(sql);
            }
        }
        WriteChange::Update(values) => {
            let mut sql = start();
            target.push_update(&mut sql, values, query)?;
            statements.push(sql);
        }
        WriteChange::Delete => {
            let mut sql = start();
            target.push_delete(&mut sql, query)?;
            statements.push(sql);
        }
    }

    for sql in &mut statements {
        sql.push(format!(" RETURNING {ROOT_ALIAS}.*) "));
        push_written_rows(sql, SelectWriter::new(schema, query), table)?;
    }

    Ok(statements)
}

fn push_written_rows<'a>(
    sql: &mut QueryBuilder<Postgres>,
    writer: SelectWriter<'a>,
    table: &'a TableModel,
) -> Result<(), DatabaseRejection> {
    let written = Level {
        table,
        items: writer.query.select.as_deref(),
        path: Vec::new(),
        source: WRITTEN_ROWS.to_owned(),
        alias: ROOT_ALIAS.to_owned(),
        link: Vec::new(),
        applies_filters: false,
    };
    let shape = ReadShape {
        counts_exactly: false,
        is_single_object: false,
    };

    push_json_rows(sql, writer, &written, shape)
}
