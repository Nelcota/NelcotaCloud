use std::future::Future;
use std::time::Duration;

use sqlx::PgPool;
use time::OffsetDateTime;

use crate::modules::database::execution::database_error_response::database_error_response;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::shared::http::api_error::ApiError;

/// Time past the statement timeout before the guard steps in.
const GUARD_GRACE: Duration = Duration::from_secs(2);

/// Ends a request's query from outside when it outlives its role's timeout.
///
/// A project's own function may change `statement_timeout` or catch the cancel signal, so the
/// guard terminates the backend through the platform's pool, which a project cannot touch.
pub struct QueryGuard {
    pub backend: BackendIdentity,
    pub statement_timeout: Duration,
    pub admin_pool: PgPool,
}

/// A backend process: its id, and when it started, since ids are reused by later backends.
#[derive(Clone, Copy)]
pub struct BackendIdentity {
    pub pid: i32,
    pub started_at: OffsetDateTime,
}

/// Selects the backend's own id and start time, for `BackendIdentity`. A macro so statements
/// can `concat!` it into a constant. `pg_stat_get_activity(pid)` builds only this backend's row,
/// where the `pg_stat_activity` view would list every backend of the server.
macro_rules! backend_identity_columns {
    () => {
        "pg_backend_pid(), (SELECT backend_start FROM pg_stat_get_activity(pg_backend_pid()))"
    };
}

pub(crate) use backend_identity_columns;

impl QueryGuard {
    /// Runs a Data API query: Postgres errors become the refusals clients act on.
    pub async fn run<T>(
        &self,
        query: impl Future<Output = Result<T, sqlx::Error>>,
    ) -> Result<T, ApiError> {
        self.run_mapped(query, database_error_response).await
    }

    /// Runs a query, turning Postgres errors into responses with `map_error`.
    pub async fn run_mapped<T>(
        &self,
        query: impl Future<Output = Result<T, sqlx::Error>>,
        map_error: fn(sqlx::Error) -> ApiError,
    ) -> Result<T, ApiError> {
        let deadline = self.statement_timeout.saturating_add(GUARD_GRACE);
        let Ok(outcome) = tokio::time::timeout(deadline, query).await else {
            self.terminate_backend().await;
            return Err(ApiError::from(DatabaseRejection::QueryTimeout));
        };

        outcome.map_err(map_error)
    }

    /// The request still holds the connection here, so the backend cannot be serving another
    /// request; the start time makes sure it is still the same process.
    async fn terminate_backend(&self) {
        let backend = self.backend;
        let termination = sqlx::query(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = $1 AND backend_start = $2",
        )
        .bind(backend.pid)
        .bind(backend.started_at)
        .execute(&self.admin_pool)
        .await;

        if let Err(error) = termination {
            tracing::error!(%error, backend_pid = backend.pid, "failed to end a slow query");
        }
    }
}
