use sqlx::{AssertSqlSafe, Column, Executor, PgConnection, SqlSafeStr, Statement};
use uuid::Uuid;

const SAVEPOINT: &str = "SAVEPOINT nelcota_result_columns";
const RELEASE: &str = "RELEASE SAVEPOINT nelcota_result_columns";
const ROLLBACK: &str = "ROLLBACK TO SAVEPOINT nelcota_result_columns";

/// The columns a statement that already ran would answer, read by preparing it again (never
/// running it twice): a query that found no rows still has a header to show.
///
/// Inside a savepoint, so a statement that cannot be prepared changes nothing in the session's
/// transaction; it then has no columns. A unique comment keeps the connection's statement cache
/// from answering with the columns of an older, same-text statement.
pub async fn empty_result_columns(
    connection: &mut PgConnection,
    statement: &str,
) -> Result<Vec<String>, sqlx::Error> {
    if sqlx::raw_sql(SAVEPOINT)
        .execute(&mut *connection)
        .await
        .is_err()
    {
        return Ok(Vec::new());
    }

    let unique_text = format!("/* nelcota:{} */ {statement}", Uuid::new_v4());
    let prepared = (&mut *connection)
        .prepare(AssertSqlSafe(unique_text).into_sql_str())
        .await;

    let prepared = match prepared {
        Ok(prepared) => prepared,
        Err(_) => {
            sqlx::raw_sql(ROLLBACK).execute(&mut *connection).await?;
            return Ok(Vec::new());
        }
    };

    sqlx::raw_sql(RELEASE).execute(connection).await?;

    Ok(prepared
        .columns()
        .iter()
        .map(|column| column.name().to_owned())
        .collect())
}
