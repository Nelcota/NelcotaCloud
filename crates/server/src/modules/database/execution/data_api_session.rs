use std::sync::Arc;

use sqlx::{Postgres, Transaction};
use time::OffsetDateTime;

use crate::app_state::AppState;
use crate::modules::database::access::data_api_caller::DataApiCaller;
use crate::modules::database::execution::query_guard::{
    BackendIdentity, QueryGuard, backend_identity_columns,
};
use crate::modules::database::execution::session_slots::SessionSlot;
use crate::modules::database::schema::schema_model::SchemaModel;
use crate::shared::http::api_error::ApiError;

/// Reads the schema version and the backend's identity, then switches the transaction to the
/// request's role with its claims and timeout, in one round trip. `set_config(..., true)` lasts
/// until the transaction ends, so a pooled connection never keeps a request's role.
const PREPARE_REQUEST: &str = concat!(
    "SELECT auth.current_schema_version(), ",
    backend_identity_columns!(),
    ", set_config('role', $1, true), set_config('request.jwt.claims', $2, true), ",
    "set_config('statement_timeout', $3, true)"
);

/// Version, backend id and start, then the three `set_config` results.
type PreparedRow = (i64, i32, OffsetDateTime, String, String, String);

/// Reads may not change data: a `GET` cannot reach a write even through a function.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TransactionAccess {
    ReadOnly,
    ReadWrite,
}

/// One Data API request: a transaction running as the caller's role, the project's schema and
/// the guard that cancels queries running too long.
pub struct DataApiSession {
    pub transaction: Transaction<'static, Postgres>,
    pub schema: Arc<SchemaModel>,
    pub guard: QueryGuard,
    /// Held until the session ends, so it counts against the instance's session limit.
    _slot: SessionSlot,
}

impl DataApiSession {
    pub async fn open(
        state: &AppState,
        caller: &DataApiCaller,
        access: TransactionAccess,
    ) -> Result<Self, ApiError> {
        let tenant_id = caller.tenant_id;
        let slot = state.data_api_slots.acquire(tenant_id).await?;
        let tenant_pools = &state.tenant_pools;
        let data_pool = tenant_pools
            .data_api_pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let admin_pool = tenant_pools
            .pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let begin = match access {
            TransactionAccess::ReadOnly => "BEGIN READ ONLY",
            TransactionAccess::ReadWrite => "BEGIN",
        };
        let mut transaction = data_pool.begin_with(begin).await?;
        let statement_timeout = caller.role.statement_timeout();
        let (version, pid, started_at, ..): PreparedRow = sqlx::query_as(PREPARE_REQUEST)
            .bind(caller.role.database_role())
            .bind(&caller.claims)
            .bind(statement_timeout.as_millis().to_string())
            .fetch_one(&mut *transaction)
            .await?;
        let schema = state
            .schema_cache
            .schema(tenant_id, version, &mut transaction)
            .await
            .map_err(ApiError::internal)?;

        Ok(Self {
            transaction,
            schema,
            guard: QueryGuard {
                backend: BackendIdentity { pid, started_at },
                statement_timeout,
                admin_pool,
            },
            _slot: slot,
        })
    }

    pub async fn commit(self) -> Result<(), ApiError> {
        self.transaction.commit().await?;

        Ok(())
    }
}
