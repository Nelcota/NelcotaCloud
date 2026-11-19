use sqlx::{Postgres, QueryBuilder};

use crate::modules::database::query::condition::{Condition, ConditionGroup, Filter, Operation};
use crate::modules::database::query::order_parser::{NullsPosition, OrderTerm};
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::schema_model::{ColumnModel, TableModel};
use crate::shared::database::sql_identifier::quote_identifier;

/// The table a condition is written against, under the alias the statement gave it.
#[derive(Clone, Copy)]
pub struct AliasedTable<'a> {
    pub table: &'a TableModel,
    pub alias: &'a str,
}

impl AliasedTable<'_> {
    /// `t0."column"` for a column the table has.
    pub fn column_sql(&self, name: &str) -> Result<(String, &ColumnModel), DatabaseRejection> {
        let column = self
            .table
            .column(name)
            .ok_or_else(|| DatabaseRejection::ColumnNotFound(name.to_owned()))?;

        Ok((format!("{}.{}", self.alias, quote_identifier(name)), column))
    }
}

/// Writes `condition AND condition ...`; values are bound, never written into the SQL.
pub fn push_conditions(
    sql: &mut QueryBuilder<Postgres>,
    target: AliasedTable,
    conditions: &[Condition],
) -> Result<(), DatabaseRejection> {
    for (index, condition) in conditions.iter().enumerate() {
        if index > 0 {
            sql.push(" AND ");
        }

        push_condition(sql, target, condition)?;
    }

    Ok(())
}

fn push_condition(
    sql: &mut QueryBuilder<Postgres>,
    target: AliasedTable,
    condition: &Condition,
) -> Result<(), DatabaseRejection> {
    match condition {
        Condition::Filter(filter) => push_filter(sql, target, filter),
        Condition::Group(group) => push_group(sql, target, group),
    }
}

fn push_group(
    sql: &mut QueryBuilder<Postgres>,
    target: AliasedTable,
    group: &ConditionGroup,
) -> Result<(), DatabaseRejection> {
    if group.is_negated {
        sql.push("NOT ");
    }

    sql.push("(");
    for (index, condition) in group.conditions.iter().enumerate() {
        if index > 0 {
            sql.push(group.kind.sql_keyword());
        }

        push_condition(sql, target, condition)?;
    }
    sql.push(")");

    Ok(())
}

fn push_filter(
    sql: &mut QueryBuilder<Postgres>,
    target: AliasedTable,
    filter: &Filter,
) -> Result<(), DatabaseRejection> {
    let (column_sql, column) = target.column_sql(&filter.column)?;
    let type_name = &column.type_name;

    if filter.is_negated {
        sql.push("NOT ");
    }

    sql.push("(").push(&column_sql);
    push_operation(sql, &filter.operation, type_name);
    sql.push(")");

    Ok(())
}

/// Text values are cast to the column's type (named by the catalog), so indexes still apply.
fn push_operation(sql: &mut QueryBuilder<Postgres>, operation: &Operation, type_name: &str) {
    match operation {
        Operation::Compare(comparison, value) => {
            sql.push(format!(" {} CAST(", comparison.sql_operator()));
            sql.push_bind(value.clone())
                .push(format!(" AS {type_name})"));
        }
        Operation::Like(pattern) => {
            sql.push("::text LIKE ").push_bind(pattern.clone());
        }
        Operation::CaseInsensitiveLike(pattern) => {
            sql.push("::text ILIKE ").push_bind(pattern.clone());
        }
        Operation::In(values) => {
            sql.push(" = ANY(CAST(").push_bind(values.clone());
            sql.push(format!(" AS {type_name}[]))"));
        }
        Operation::Is(value) => {
            sql.push(format!(" IS {}", value.sql_keyword()));
        }
        Operation::Contains(value) => push_typed(sql, " @> ", value, type_name),
        Operation::ContainedBy(value) => push_typed(sql, " <@ ", value, type_name),
        Operation::Overlaps(value) => push_typed(sql, " && ", value, type_name),
    }
}

fn push_typed(sql: &mut QueryBuilder<Postgres>, operator: &str, value: &str, type_name: &str) {
    sql.push(format!("{operator}CAST("));
    sql.push_bind(value.to_owned())
        .push(format!(" AS {type_name})"));
}

/// ` ORDER BY t0."a" DESC NULLS LAST, ...`, or nothing.
pub fn push_order(
    sql: &mut QueryBuilder<Postgres>,
    target: AliasedTable,
    order: &[OrderTerm],
) -> Result<(), DatabaseRejection> {
    for (index, term) in order.iter().enumerate() {
        let (column_sql, _) = target.column_sql(&term.column)?;
        let separator = match index {
            0 => " ORDER BY ",
            _ => ", ",
        };
        let direction = match term.is_descending {
            true => " DESC",
            false => " ASC",
        };
        let nulls = term
            .nulls
            .map(NullsPosition::sql_keyword)
            .unwrap_or_default();
        sql.push(format!("{separator}{column_sql}{direction}{nulls}"));
    }

    Ok(())
}
