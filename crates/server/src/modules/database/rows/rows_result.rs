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

    /// The rows of several statements (insert batches) as one array, or as the single object
    /// that was asked for.
    pub fn merge(
        rows: Vec<StatementRow>,
        is_single_object: bool,
    ) -> Result<Self, DatabaseRejection> {
        let mut elements = Vec::new();
        let mut row_count: i64 = 0;

        for (body, count, _) in rows {
            let Some(body) = body else {
                return Err(DatabaseRejection::ResponseTooLarge);
            };
            let inner = array_elements(&body)?;

            if inner.is_empty() == false {
                elements.push(inner.to_owned());
            }

            row_count = row_count.saturating_add(count);
        }

        let body = match is_single_object {
            true => single_object(elements, row_count)?,
            false => format!("[{}]", elements.join(",")),
        };

        Ok(Self {
            body: Some(body),
            row_count,
            total: None,
            offset: 0,
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

/// `[a,b]` becomes `a,b`: Postgres wrote the array, so its first and last bytes are the brackets.
fn array_elements(body: &str) -> Result<&str, DatabaseRejection> {
    body.trim()
        .strip_prefix('[')
        .and_then(|rest| rest.strip_suffix(']'))
        .map(str::trim)
        .ok_or_else(|| DatabaseRejection::invalid_query("unexpected result shape"))
}

fn single_object(elements: Vec<String>, row_count: i64) -> Result<String, DatabaseRejection> {
    let mut elements = elements.into_iter();
    let (Some(object), None) = (elements.next(), elements.next()) else {
        return Err(DatabaseRejection::NotSingleRow(
            u64::try_from(row_count).unwrap_or_default(),
        ));
    };

    if row_count != 1 {
        return Err(DatabaseRejection::NotSingleRow(
            u64::try_from(row_count).unwrap_or_default(),
        ));
    }

    Ok(object)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(body: &str, count: i64) -> StatementRow {
        (Some(body.to_owned()), count, None)
    }

    #[test]
    fn merges_the_rows_of_every_batch() -> Result<(), DatabaseRejection> {
        let merged = RowsResult::merge(
            vec![row("[{\"a\":1}]", 1), row("[]", 0), row("[{\"a\":2}]", 1)],
            false,
        )?;

        assert_eq!(merged.body.as_deref(), Some("[{\"a\":1},{\"a\":2}]"));
        assert_eq!(merged.row_count, 2);
        Ok(())
    }

    #[test]
    fn answers_one_object_only_for_one_row() -> Result<(), DatabaseRejection> {
        let single = RowsResult::merge(vec![row("[{\"a\":1}]", 1)], true)?;

        assert_eq!(single.body.as_deref(), Some("{\"a\":1}"));
        assert!(
            RowsResult::merge(vec![row("[{\"a\":1}]", 1), row("[{\"a\":2}]", 1)], true).is_err()
        );
        assert!(RowsResult::merge(vec![row("[]", 0)], true).is_err());
        assert!(RowsResult::merge(vec![(None, 1, None)], false).is_err());
        Ok(())
    }
}
