use std::time::Duration;

use sqlx::{AssertSqlSafe, Postgres, Transaction};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::database::admin::developer_sql::sql_error_response::sql_error_response;
use crate::modules::database::execution::database_sessions::{
    DatabaseSessionPools, DatabaseSessions,
};
use crate::modules::database::execution::query_guard::{
    BackendIdentity, QueryGuard, backend_identity_columns,
};
use crate::modules::database::execution::session_slots::SessionSlot;
use crate::modules::tenants::postgres::database_roles::DEVELOPER_ROLE;
use crate::shared::http::api_error::ApiError;

/// The console's SQL may run longer than API requests, but never unbounded.
const DEVELOPER_STATEMENT_TIMEOUT: Duration = Duration::from_secs(15);

/// Switches the transaction to the developer role. The session itself is the project's own
/// authenticator, so SQL that falls back to it (`RESET ROLE`) stays in the project.
/// Use the same string literal mode as the parser that validates the script.
const PREPARE_DEVELOPER: &str = concat!(
    "SELECT ",
    backend_identity_columns!(),
    ", set_config('role', $1, true), set_config('statement_timeout', $2, true), ",
    "set_config('search_path', 'public', true), ",
    "set_config('standard_conforming_strings', 'on', true)"
);

/// Backend id and start, then the four `set_config` results.
type PreparedRow = (i32, OffsetDateTime, String, String, String, String);

/// A transaction on a project's database as its developer role: the console's table editor
/// and SQL editor run here.
pub struct DeveloperSession {
    pub transaction: Transaction<'static, Postgres>,
    pub guard: QueryGuard,
    /// Held until the session ends, so it counts against the instance's session limit.
    _slot: SessionSlot,
}

impl DeveloperSession {
    pub async fn open(sessions: &DatabaseSessions<'_>, tenant_id: Uuid) -> Result<Self, ApiError> {
        let DatabaseSessionPools {
            slot,
            data_pool,
            admin_pool,
        } = sessions.acquire(tenant_id).await?;
        let mut connection = data_pool.acquire().await?;
        // Closing the connection discards settings and temporary objects that survive commit.
        connection.close_on_drop();
        let mut transaction = Transaction::begin(connection, None).await?;
        let (pid, started_at, ..): PreparedRow = sqlx::query_as(PREPARE_DEVELOPER)
            .bind(DEVELOPER_ROLE)
            .bind(DEVELOPER_STATEMENT_TIMEOUT.as_millis().to_string())
            .fetch_one(&mut *transaction)
            .await?;

        Ok(Self {
            transaction,
            guard: QueryGuard::new(
                admin_pool,
                BackendIdentity { pid, started_at },
                DEVELOPER_STATEMENT_TIMEOUT,
            ),
            _slot: slot,
        })
    }

    /// Runs statements built by the platform (DDL from validated requests); Postgres messages
    /// are passed on, as the project's own SQL editor would show them.
    pub async fn execute(&mut self, statements: String) -> Result<(), ApiError> {
        let execution = sqlx::raw_sql(AssertSqlSafe(statements)).execute(&mut *self.transaction);
        self.guard.run_mapped(execution, sql_error_response).await?;

        Ok(())
    }

    pub async fn commit(self) -> Result<(), ApiError> {
        self.guard
            .run_mapped(self.transaction.commit(), sql_error_response)
            .await
    }
}
