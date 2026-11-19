use std::sync::Arc;

use serde_json::Value;

use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::execution::data_api_session::{DataApiSession, TransactionAccess};
use crate::modules::database::execution::database_sessions::DatabaseSessions;
use crate::modules::database::query::preferences::Preferences;
use crate::modules::database::query::write_query::WriteQuery;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::rows::returning_rows::ReturningRows;
use crate::modules::database::rows::rows_result::{RowsResult, StatementRow};
use crate::modules::database::rows::write_body::{conflict_action, insert_batches, update_values};
use crate::modules::database::schema::schema_model::TableModel;
use crate::modules::database::sql::write_change::WriteChange;
use crate::modules::database::sql::write_statement::{
    write_returning_statements, write_statements,
};
use crate::shared::http::api_error::ApiError;

/// Which change a write request makes; the body is checked against the table's columns.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum WriteKind {
    Insert,
    Update,
    Delete,
}

pub struct RowWrite<'a> {
    pub kind: WriteKind,
    pub table_name: &'a str,
    pub query: &'a WriteQuery,
    pub preferences: &'a Preferences,
    pub body: Value,
}

/// Inserts, updates or deletes rows as the caller's role: the table's privileges and row level
/// security policies decide what is allowed.
pub async fn write_rows(
    sessions: &DatabaseSessions<'_>,
    caller: &DataApiCaller,
    mut write: RowWrite<'_>,
) -> Result<RowsResult, ApiError> {
    let mut session = DataApiSession::open(sessions, caller, TransactionAccess::ReadWrite).await?;
    let schema = Arc::clone(&session.schema);
    let table = schema
        .table(write.table_name)
        .ok_or_else(|| DatabaseRejection::TableNotFound(write.table_name.to_owned()))?;
    let query = &write.query.selection;
    let returns_rows = write.preferences.returns_rows;
    let change = write_change(table, &mut write)?;

    if returns_rows {
        let mut rows = ReturningRows::new();

        for mut statement in write_returning_statements(&schema, table, query, change)? {
            let row: StatementRow = session
                .guard
                .run(
                    statement
                        .build_query_as()
                        .fetch_one(&mut *session.transaction),
                )
                .await?;
            rows.push(row)?;
        }

        let result = rows.finish(write.preferences.is_single_object)?;
        session.commit().await?;
        return Ok(result);
    }

    let mut rows_affected: u64 = 0;

    for mut statement in write_statements(table, query, change)? {
        let outcome = session
            .guard
            .run(statement.build().execute(&mut *session.transaction))
            .await?;
        rows_affected = rows_affected.saturating_add(outcome.rows_affected());
    }

    // Like with `return=representation`: a single-object write that touched more or fewer
    // rows is refused, and dropping the session rolls it back.
    if write.preferences.is_single_object && rows_affected != 1 {
        return Err(ApiError::from(DatabaseRejection::NotSingleRow(
            rows_affected,
        )));
    }

    session.commit().await?;

    Ok(RowsResult::without_rows(rows_affected))
}

fn write_change(
    table: &TableModel,
    write: &mut RowWrite,
) -> Result<WriteChange, DatabaseRejection> {
    let selection = &write.query.selection;

    if write.kind != WriteKind::Insert && selection.has_root_conditions() == false {
        return Err(DatabaseRejection::FilterRequired);
    }

    if selection
        .root()
        .is_some_and(|root| root.limit.is_some() || root.offset.is_some())
    {
        return Err(DatabaseRejection::invalid_query(
            "limit and offset do not apply to writes: narrow them with filters",
        ));
    }

    match write.kind {
        WriteKind::Insert => {
            let mut batches = insert_batches(table, std::mem::take(&mut write.body))?;
            if let Some(resolution) = write.preferences.resolution {
                let on_conflict = write.query.on_conflict.as_deref();
                for batch in &mut batches {
                    let action = conflict_action(table, on_conflict, resolution, &batch.columns)?;
                    batch.conflict = Some(action);
                }
            }
            Ok(WriteChange::Insert(batches))
        }
        WriteKind::Update => {
            update_values(table, std::mem::take(&mut write.body)).map(WriteChange::Update)
        }
        WriteKind::Delete => Ok(WriteChange::Delete),
    }
}
