use futures_util::TryStreamExt;
use serde::Serialize;
use sqlx::postgres::{PgQueryResult, PgRow};
use sqlx::{AssertSqlSafe, Column, Either, Row, ValueRef};
use utoipa::ToSchema;

use crate::modules::database::admin::developer_sql::developer_session::DeveloperSession;
use crate::modules::database::admin::developer_sql::sql_error_response::sql_error_response;
use crate::shared::http::api_error::ApiError;

/// Rows of the last result set the console shows; the rest is read and dropped, never kept.
pub const MAX_RESULT_ROWS: usize = 1_000;
/// Characters of one value the console shows; longer values are cut.
const MAX_VALUE_CHARS: usize = 10_000;
/// Bytes of values kept in all; rows beyond are read and dropped, like rows past the limit.
const MAX_RESULT_BYTES: usize = 4 * 1024 * 1024;
const CUT_MARK: &str = "…";

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
}

/// Runs a script (several statements allowed) in the developer session. The simple query
/// protocol returns values as text, so any type is shown as Postgres prints it.
pub async fn run_script(
    session: &mut DeveloperSession,
    script: String,
) -> Result<SqlResult, ApiError> {
    let transaction = &mut *session.transaction;
    let reading = async move {
        let mut result = SqlResult::empty();
        let mut stream = sqlx::raw_sql(AssertSqlSafe(script)).fetch_many(transaction);

        while let Some(item) = stream.try_next().await? {
            result.absorb(item);
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
        }
    }

    fn absorb(&mut self, item: Either<PgQueryResult, PgRow>) {
        match item {
            Either::Left(outcome) => {
                self.rows_affected = self.rows_affected.saturating_add(outcome.rows_affected());
                self.starts_new_set = true;
            }
            Either::Right(row) => self.add_row(&row),
        }
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

fn row_values(row: &PgRow) -> Vec<Option<String>> {
    (0..row.len())
        .map(|index| {
            let value = row.try_get_raw(index).ok()?;

            if value.is_null() {
                return None;
            }

            value.as_str().ok().map(shown_value)
        })
        .collect()
}

/// The value as shown: at most `MAX_VALUE_CHARS` characters, cut values marked.
fn shown_value(text: &str) -> String {
    let Some((cut_at, _)) = text.char_indices().nth(MAX_VALUE_CHARS) else {
        return text.to_owned();
    };
    let kept = text.get(..cut_at).unwrap_or_default();

    format!("{kept}{CUT_MARK}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cuts_long_values_on_a_character_boundary() {
        let long = "é".repeat(MAX_VALUE_CHARS + 5);
        let shown = shown_value(&long);

        assert_eq!(shown.chars().count(), MAX_VALUE_CHARS + 1);
        assert!(shown.ends_with(CUT_MARK));
        assert_eq!(shown_value("short"), "short");
    }
}
