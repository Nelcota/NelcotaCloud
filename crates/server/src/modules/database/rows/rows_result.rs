use crate::modules::database::rejection::database_rejection::DatabaseRejection;

/// What a Data API request answers: the rows as JSON (none for `return=minimal`), how many
/// there are and, when counted, how many match in total.
pub struct RowsResult {
    pub body: Option<String>,
    pub row_count: i64,
    pub total: Option<i64>,
    /// Position of the first row, for the `Content-Range` header.
    pub offset: u32,
}

/// One row of a Data API statement: `body` (`NULL` past the size limit), `row_count`, `total`.
pub type StatementRow = (Option<String>, i64, Option<i64>);

impl RowsResult {
    pub fn from_row(row: StatementRow, offset: u32) -> Result<Self, DatabaseRejection> {
        let (body, row_count, total) = row;
        let Some(body) = body else {
            return Err(DatabaseRejection::ResponseTooLarge);
        };

        Ok(Self {
            body: Some(body),
            row_count,
            total,
            offset,
        })
    }

    /// A write answered with `return=minimal`.
    pub fn without_rows(rows_affected: u64) -> Self {
        Self {
            body: None,
            row_count: i64::try_from(rows_affected).unwrap_or(i64::MAX),
            total: None,
            offset: 0,
        }
    }
}
