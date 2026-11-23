use std::time::Duration;

use sqlx::{PgConnection, PgPool, Postgres, SqlSafeStr, Transaction};
use time::OffsetDateTime;

use crate::modules::database::admin::developer_sql::sql_error_response::sql_error_response;
use crate::modules::database::execution::query_guard::{
    BackendIdentity, QueryGuard, backend_identity_columns,
};
use crate::shared::http::api_error::ApiError;

const STATEMENT_TIMEOUT: Duration = Duration::from_secs(15);
const PREPARE: &str = concat!(
    "SELECT ",
    backend_identity_columns!(),
    ", set_config('statement_timeout', $1, true), ",
    "set_config('search_path', 'pg_catalog', true)"
);
const MIGRATION_LOCK: &str = "SELECT pg_catalog.pg_advisory_xact_lock(7120000004)";

pub(super) struct MigrationSession<'connection> {
    pub transaction: Transaction<'connection, Postgres>,
    guard: QueryGuard,
}

impl<'connection> MigrationSession<'connection> {
    pub(super) async fn open(
        connection: &'connection mut PgConnection,
        pool: &PgPool,
    ) -> Result<Self, ApiError> {
        let begin = "BEGIN ISOLATION LEVEL READ COMMITTED";
        let mut transaction = Transaction::begin(connection, Some(begin.into_sql_str())).await?;
        let (pid, started_at, ..): (i32, OffsetDateTime, String, String) = sqlx::query_as(PREPARE)
            .bind(STATEMENT_TIMEOUT.as_millis().to_string())
            .fetch_one(&mut *transaction)
            .await?;
        sqlx::query("SET LOCAL ROLE nelcota_migrator")
            .execute(&mut *transaction)
            .await?;
        let guard = QueryGuard::new(
            pool.clone(),
            BackendIdentity { pid, started_at },
            STATEMENT_TIMEOUT,
        );
        let lock = sqlx::query(MIGRATION_LOCK).execute(&mut *transaction);
        guard.run_mapped(lock, sql_error_response).await?;

        Ok(Self { transaction, guard })
    }

    pub(super) async fn execute(&mut self, script: &str) -> Result<(), ApiError> {
        let execution = sqlx::query("SELECT nelcota_migrations.execute_script($1)")
            .bind(script)
            .execute(&mut *self.transaction);
        self.guard.run_mapped(execution, sql_error_response).await?;

        Ok(())
    }

    pub(super) async fn commit(self) -> Result<(), ApiError> {
        let commit = self.transaction.commit();
        self.guard.run_mapped(commit, sql_error_response).await
    }
}
