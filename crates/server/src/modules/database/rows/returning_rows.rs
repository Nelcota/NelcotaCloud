use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::rows::rows_result::{RowsResult, StatementRow};
use crate::modules::database::sql::read_statement::MAX_RESPONSE_BYTES;

/// Collects write results without retaining more than the response budget across batches.
pub(crate) struct ReturningRows {
    body: String,
    row_count: i64,
}

impl ReturningRows {
    pub(crate) fn new() -> Self {
        Self {
            body: "[".to_owned(),
            row_count: 0,
        }
    }

    pub(crate) fn push(&mut self, row: StatementRow) -> Result<(), DatabaseRejection> {
        let (body, count, _) = row;
        let body = body.ok_or(DatabaseRejection::ResponseTooLarge)?;
        let elements = array_elements(&body)?;

        if elements.is_empty() {
            return Ok(());
        }

        let separator = usize::from(self.row_count > 0);
        let bytes = self
            .body
            .len()
            .saturating_add(separator)
            .saturating_add(elements.len());

        if bytes >= MAX_RESPONSE_BYTES {
            return Err(DatabaseRejection::ResponseTooLarge);
        }

        if separator > 0 {
            self.body.push(',');
        }

        self.body.push_str(elements);
        self.row_count = self.row_count.saturating_add(count);

        Ok(())
    }

    pub(crate) fn finish(
        mut self,
        is_single_object: bool,
    ) -> Result<RowsResult, DatabaseRejection> {
        let row_count = self.row_count;
        self.body.push(']');
        let body = match is_single_object {
            true => single_object(&self.body, row_count)?.to_owned(),
            false => self.body,
        };

        Ok(RowsResult {
            body: Some(body),
            row_count,
            total: None,
            offset: 0,
        })
    }
}

fn array_elements(body: &str) -> Result<&str, DatabaseRejection> {
    body.trim()
        .strip_prefix('[')
        .and_then(|rest| rest.strip_suffix(']'))
        .map(str::trim)
        .ok_or_else(|| DatabaseRejection::invalid_query("unexpected result shape"))
}

fn single_object(body: &str, row_count: i64) -> Result<&str, DatabaseRejection> {
    if row_count != 1 {
        return Err(DatabaseRejection::NotSingleRow(
            u64::try_from(row_count).unwrap_or_default(),
        ));
    }

    array_elements(body)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(body: &str, count: i64) -> StatementRow {
        (Some(body.to_owned()), count, None)
    }

    #[test]
    fn combines_batches_and_skips_empty_results() -> Result<(), DatabaseRejection> {
        let mut rows = ReturningRows::new();
        rows.push(row(r#"[{"a":1}]"#, 1))?;
        rows.push(row("[]", 0))?;
        rows.push(row(r#"[{"a":2}]"#, 1))?;
        let result = rows.finish(false)?;

        assert_eq!(result.body.as_deref(), Some(r#"[{"a":1},{"a":2}]"#));
        assert_eq!(result.row_count, 2);
        Ok(())
    }

    #[test]
    fn returns_one_object_only_for_one_row() -> Result<(), DatabaseRejection> {
        let empty = ReturningRows::new();
        assert!(matches!(
            empty.finish(true),
            Err(DatabaseRejection::NotSingleRow(0))
        ));

        let mut single = ReturningRows::new();
        single.push(row(r#"[{"a":1}]"#, 1))?;
        assert_eq!(single.finish(true)?.body.as_deref(), Some(r#"{"a":1}"#));

        let mut multiple = ReturningRows::new();
        multiple.push(row(r#"[{"a":1},{"a":2}]"#, 2))?;
        assert!(matches!(
            multiple.finish(true),
            Err(DatabaseRejection::NotSingleRow(2))
        ));
        Ok(())
    }
}
