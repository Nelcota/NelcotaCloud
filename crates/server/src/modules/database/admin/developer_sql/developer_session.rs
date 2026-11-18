use std::time::Duration;

use sqlx::{AssertSqlSafe, Postgres, Transaction};
use time::OffsetDateTime;
use uuid::Uuid;

use tokio::sync::OwnedSemaphorePermit;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::sql_error_response::sql_error_response;
use crate::modules::database::execution::query_guard::{
    BACKEND_IDENTITY_COLUMNS, BackendIdentity, QueryGuard,
};
use crate::modules::tenants::database::database_roles::DEVELOPER_ROLE;
use crate::shared::http::api_error::ApiError;

/// The console's SQL may run longer than API requests, but never unbounded.
const DEVELOPER_STATEMENT_TIMEOUT: Duration = Duration::from_secs(15);

/// Switches the transaction to the developer role. The session itself is the project's own
/// authenticator, so SQL that falls back to it (`RESET ROLE`, `COMMIT`) stays in the project.
fn prepare_developer() -> String {
    format!(
        "SELECT {BACKEND_IDENTITY_COLUMNS}, set_config('role', $1, true), set_config('statement_timeout', $2, true), set_config('search_path', 'public', true)"
    )
}

/// Backend id and start, then the three `set_config` results.
type PreparedRow = (i32, OffsetDateTime, String, String, String);

/// A transaction on a project's database as its developer role: the console's table editor
/// and SQL editor run here.
pub struct DeveloperSession {
    pub transaction: Transaction<'static, Postgres>,
    pub guard: QueryGuard,
    /// Held until the session ends, so it counts against the instance's session limit.
    _slot: OwnedSemaphorePermit,
}

impl DeveloperSession {
    pub async fn open(state: &AppState, tenant_id: Uuid) -> Result<Self, ApiError> {
        let slot = state.data_api_slots.acquire().await?;
        let tenant_pools = &state.tenant_pools;
        let data_pool = tenant_pools
            .data_api_pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let admin_pool = tenant_pools
            .pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let mut connection = data_pool.acquire().await?;
        // Closing the connection discards settings and temporary objects that survive commit.
        connection.close_on_drop();
        let mut transaction = Transaction::begin(connection, None).await?;
        let (pid, started_at, ..): PreparedRow = sqlx::query_as(AssertSqlSafe(prepare_developer()))
            .bind(DEVELOPER_ROLE)
            .bind(DEVELOPER_STATEMENT_TIMEOUT.as_millis().to_string())
            .fetch_one(&mut *transaction)
            .await?;

        Ok(Self {
            transaction,
            guard: QueryGuard {
                backend: BackendIdentity { pid, started_at },
                statement_timeout: DEVELOPER_STATEMENT_TIMEOUT,
                admin_pool,
            },
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
        self.transaction.commit().await.map_err(sql_error_response)
    }
}
