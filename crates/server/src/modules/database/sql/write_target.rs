use sqlx::{Postgres, QueryBuilder};

use crate::modules::database::query::read_query::ReadQuery;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::schema_model::TableModel;
use crate::modules::database::sql::condition_writer::{AliasedTable, push_conditions};
use crate::modules::database::sql::read_statement::ROOT_ALIAS;
use crate::modules::database::sql::write_change::{ConflictAction, InsertBatch, UpdateValues};
use crate::shared::database::sql_identifier::quote_identifier;

/// The written table, as `public."name" AS t0`.
pub struct WriteTarget<'a> {
    table: &'a TableModel,
    table_sql: String,
}

impl<'a> WriteTarget<'a> {
    pub fn new(table: &'a TableModel) -> Self {
        Self {
            table,
            table_sql: format!("public.{}", quote_identifier(&table.name)),
        }
    }

    fn aliased(&self) -> AliasedTable<'a> {
        AliasedTable {
            table: self.table,
            alias: ROOT_ALIAS,
        }
    }

    pub fn push_insert(&self, sql: &mut QueryBuilder<Postgres>, batch: InsertBatch) {
        let table_sql = &self.table_sql;
        let columns = quoted_list(&batch.columns);
        sql.push(format!(
            "INSERT INTO {table_sql} AS {ROOT_ALIAS} ({columns}) SELECT {columns} \
             FROM json_populate_recordset(NULL::{table_sql}, CAST("
        ));
        sql.push_bind(batch.rows_json).push(" AS json))");
        push_conflict(sql, batch.conflict.as_ref());
    }

    pub fn push_update(
        &self,
        sql: &mut QueryBuilder<Postgres>,
        values: UpdateValues,
        query: &ReadQuery,
    ) -> Result<(), DatabaseRejection> {
        let table_sql = &self.table_sql;
        let assignments = values
            .columns
            .iter()
            .map(|column| format!("{0} = _b.{0}", quote_identifier(column)))
            .collect::<Vec<_>>()
            .join(", ");
        sql.push(format!(
            "UPDATE {table_sql} AS {ROOT_ALIAS} SET {assignments} \
             FROM json_populate_record(NULL::{table_sql}, CAST("
        ));
        sql.push_bind(values.values_json).push(" AS json)) AS _b");

        push_filters(sql, self.aliased(), query)
    }

    pub fn push_delete(
        &self,
        sql: &mut QueryBuilder<Postgres>,
        query: &ReadQuery,
    ) -> Result<(), DatabaseRejection> {
        sql.push(format!("DELETE FROM {} AS {ROOT_ALIAS}", self.table_sql));

        push_filters(sql, self.aliased(), query)
    }
}

/// Updates and deletes always carry a filter: a missing one is refused, never "every row".
fn push_filters(
    sql: &mut QueryBuilder<Postgres>,
    target: AliasedTable,
    query: &ReadQuery,
) -> Result<(), DatabaseRejection> {
    let Some(root) = query
        .root()
        .filter(|root| root.conditions.is_empty() == false)
    else {
        return Err(DatabaseRejection::FilterRequired);
    };

    sql.push(" WHERE ");
    push_conditions(sql, target, &root.conditions)
}

fn push_conflict(sql: &mut QueryBuilder<Postgres>, conflict: Option<&ConflictAction>) {
    let Some(conflict) = conflict else {
        return;
    };
    let targets = quoted_list(&conflict.target_columns);
    let assignments = conflict
        .updated_columns
        .iter()
        .map(|column| format!("{0} = EXCLUDED.{0}", quote_identifier(column)))
        .collect::<Vec<_>>()
        .join(", ");

    if assignments.is_empty() {
        sql.push(format!(" ON CONFLICT ({targets}) DO NOTHING"));
        return;
    }

    sql.push(format!(
        " ON CONFLICT ({targets}) DO UPDATE SET {assignments}"
    ));
}

fn quoted_list(columns: &[String]) -> String {
    columns
        .iter()
        .map(|column| quote_identifier(column))
        .collect::<Vec<_>>()
        .join(", ")
}
