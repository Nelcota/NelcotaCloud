use futures_util::TryStreamExt;
use serde::Serialize;
use sqlx::postgres::{PgQueryResult, PgRow};
use sqlx::{AssertSqlSafe, Column, Either, Row};
use utoipa::ToSchema;

use crate::modules::database::admin::developer_sql::developer_session::DeveloperSession;
use crate::modules::database::admin::developer_sql::empty_result_columns::empty_result_columns;
use crate::modules::database::admin::developer_sql::script_statements::{
    ScriptStatement, describe_script,
};
use crate::modules::database::admin::developer_sql::sql_error_response::sql_error_response;
use crate::modules::database::admin::developer_sql::sql_values::row_values;
use crate::shared::http::api_error::ApiError;

/// Rows of the last result set the console shows; the rest is read and dropped, never kept.
pub const MAX_RESULT_ROWS: usize = 1_000;
/// Bytes of values kept in all; rows beyond are read and dropped, like rows past the limit.
const MAX_RESULT_BYTES: usize = 4 * 1024 * 1024;

/// What the SQL editor shows: the last result set of the script (values as Postgres writes
/// them as text) and how many rows the statements changed.
#[derive(Debug, Serialize, ToSchema)]
pub struct SqlResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
    /// Rows of the last result set, including those beyond the shown ones.
    pub row_count: u64,
    pub rows_affected: u64,
    pub is_truncated: bool,
    /// Set when a statement completes: its next row starts a new result set.
    #[serde(skip)]
    starts_new_set: bool,
    /// Bytes of the values kept so far.
    #[serde(skip)]
    kept_bytes: usize,
    #[serde(skip)]
    completed_statements: usize,
    /// A query that answered no rows after the last result set: its header is the last one.
    #[serde(skip)]
    empty_query: Option<usize>,
}

/// Runs a script (several statements allowed) in the developer session. The simple query
/// protocol returns values as text, so any type is shown as Postgres prints it.
pub async fn run_script(
    session: &mut DeveloperSession,
    script: String,
) -> Result<SqlResult, ApiError> {
    let (script, statements) = tokio::task::spawn_blocking(move || {
        let statements = describe_script(&script);

        (script, statements)
    })
    .await
    .map_err(ApiError::internal)?;
    let transaction = &mut *session.transaction;
    let reading = async move {
        let mut result = SqlResult::empty();
        let mut stream =
            sqlx::raw_sql(AssertSqlSafe(script.as_str())).fetch_many(&mut *transaction);

        while let Some(item) = stream.try_next().await? {
            result.absorb(item, &statements);
        }

        drop(stream);

        if let Some(statement) = result.pending_empty_query(&statements, &script) {
            let columns = empty_result_columns(transaction, statement).await?;
            result.show_empty(columns);
        }

        Ok(result)
    };

    session.guard.run_mapped(reading, sql_error_response).await
}

impl SqlResult {
    fn empty() -> Self {
        Self {
            columns: Vec::new(),
            rows: Vec::new(),
            row_count: 0,
            rows_affected: 0,
            is_truncated: false,
            starts_new_set: true,
            kept_bytes: 0,
            completed_statements: 0,
            empty_query: None,
        }
    }

    fn absorb(&mut self, item: Either<PgQueryResult, PgRow>, statements: &[ScriptStatement]) {
        match item {
            Either::Left(outcome) => self.complete_statement(&outcome, statements),
            Either::Right(row) => self.add_row(&row),
        }
    }

    /// A statement that returned rows reports how many it read (`SELECT 10`): only statements
    /// without rows count as changes. One without rows that is a query is remembered, so its
    /// empty result set replaces the previous one.
    fn complete_statement(&mut self, outcome: &PgQueryResult, statements: &[ScriptStatement]) {
        let statement_index = self.completed_statements;
        self.completed_statements = statement_index.saturating_add(1);

        if self.starts_new_set {
            self.rows_affected = self.rows_affected.saturating_add(outcome.rows_affected());

            if statements
                .get(statement_index)
                .is_some_and(|statement| statement.returns_rows)
            {
                self.empty_query = Some(statement_index);
            }
        }

        self.starts_new_set = true;
    }

    /// Only when every statement was matched to its completion: otherwise the split and the
    /// server disagree, and no header is guessed.
    fn pending_empty_query<'a>(
        &self,
        statements: &[ScriptStatement],
        script: &'a str,
    ) -> Option<&'a str> {
        if self.completed_statements != statements.len() {
            return None;
        }

        statements.get(self.empty_query?)?.source(script)
    }

    fn show_empty(&mut self, columns: Vec<String>) {
        if columns.is_empty() {
            return;
        }

        self.columns = columns;
        self.rows.clear();
        self.row_count = 0;
        self.is_truncated = false;
        self.kept_bytes = 0;
    }

    fn add_row(&mut self, row: &PgRow) {
        if self.starts_new_set {
            self.columns = row
                .columns()
                .iter()
                .map(|column| column.name().to_owned())
                .collect();
            self.rows.clear();
            self.row_count = 0;
            self.is_truncated = false;
            self.starts_new_set = false;
            self.kept_bytes = 0;
            self.empty_query = None;
        }

        self.row_count = self.row_count.saturating_add(1);

        if self.rows.len() >= MAX_RESULT_ROWS || self.is_truncated {
            self.is_truncated = true;
            return;
        }

        let values = row_values(row);
        let row_bytes: usize = values.iter().flatten().map(String::len).sum();
        let kept_bytes = self.kept_bytes.saturating_add(row_bytes);

        // Checked before keeping the row, so one wide row cannot overshoot the budget.
        if kept_bytes > MAX_RESULT_BYTES {
            self.is_truncated = true;
            return;
        }

        self.kept_bytes = kept_bytes;
        self.rows.push(values);
    }
}
