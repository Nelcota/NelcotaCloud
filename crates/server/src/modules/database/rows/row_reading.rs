use std::sync::Arc;

use serde_json::Value;

use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::execution::data_api_session::{DataApiSession, TransactionAccess};
use crate::modules::database::execution::database_sessions::DatabaseSessions;
use crate::modules::database::query::preferences::{CountMode, Preferences};
use crate::modules::database::query::read_query::ReadQuery;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::rows::rows_result::{RowsResult, StatementRow};
use crate::modules::database::sql::read_statement::{
    ReadShape, planned_count_statement, read_statement,
};
use crate::shared::http::api_error::ApiError;

/// Where the planner's row estimate sits in `EXPLAIN (FORMAT JSON)`.
const PLAN_ROWS_POINTER: &str = "/0/Plan/Plan Rows";

/// A read of one table: the rows the caller's role and policies allow, shaped by the query.
pub struct RowRead<'a> {
    pub table_name: &'a str,
    pub query: &'a ReadQuery,
    pub preferences: &'a Preferences,
}

pub async fn read_rows(
    sessions: &DatabaseSessions<'_>,
    caller: &DataApiCaller,
    read: RowRead<'_>,
) -> Result<RowsResult, ApiError> {
    let mut session = DataApiSession::open(sessions, caller, TransactionAccess::ReadOnly).await?;
    let schema = Arc::clone(&session.schema);
    let table = schema
        .table(read.table_name)
        .ok_or_else(|| DatabaseRejection::TableNotFound(read.table_name.to_owned()))?;
    let preferences = read.preferences;
    let shape = ReadShape {
        counts_exactly: preferences.count == Some(CountMode::Exact),
        is_single_object: preferences.is_single_object,
    };
    let mut statement = read_statement(&schema, read.query, table, shape)?;
    let row: StatementRow = session
        .guard
        .run(
            statement
                .build_query_as()
                .fetch_one(&mut *session.transaction),
        )
        .await?;
    let offset = read.query.root().and_then(|root| root.offset).unwrap_or(0);
    let mut result = RowsResult::from_row(row, offset)?;

    if preferences.count == Some(CountMode::Planned) {
        let mut statement = planned_count_statement(&schema, read.query, table)?;
        let plan: Value = session
            .guard
            .run(
                statement
                    .build_query_scalar()
                    .fetch_one(&mut *session.transaction),
            )
            .await?;
        // An estimate below the rows this page already reached would hide the next pages.
        let rows_reached = i64::from(offset).saturating_add(result.row_count);
        result.total = planned_rows(&plan).map(|planned| planned.max(rows_reached));
    }

    if preferences.is_single_object && result.row_count != 1 {
        let row_count = u64::try_from(result.row_count).unwrap_or_default();
        return Err(ApiError::from(DatabaseRejection::NotSingleRow(row_count)));
    }

    session.commit().await?;

    Ok(result)
}

fn planned_rows(plan: &Value) -> Option<i64> {
    let estimate = plan.pointer(PLAN_ROWS_POINTER)?.as_f64()?;

    if estimate.is_finite() == false || estimate < 0.0 {
        return None;
    }

    format!("{estimate:.0}").parse().ok()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn reads_the_planner_estimate() {
        let plan = json!([{ "Plan": { "Node Type": "Seq Scan", "Plan Rows": 1234.0 } }]);

        assert_eq!(planned_rows(&plan), Some(1234));
        assert_eq!(planned_rows(&json!([])), None);
        let negative = json!([{ "Plan": { "Plan Rows": -1.0 } }]);
        assert_eq!(planned_rows(&negative), None);
    }
}
