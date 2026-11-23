use std::sync::Arc;

use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolError;

/// Wrong passwords counted over the last quarter hour.
const WINDOW_MINUTES: i32 = 15;
/// More than a person mistyping: alerts from this many in the window.
const MIN_LOGIN_FAILURES: i64 = 30;

#[derive(Debug, thiserror::Error)]
pub enum LoginCheckError {
    #[error("could not open the project's database: {0}")]
    Pool(#[from] Arc<TenantPoolError>),
    #[error("could not count refused logins: {0}")]
    Database(#[from] sqlx::Error),
}

/// How many logins the project refused in the window, when it is enough to alert.
pub async fn login_failure_spike(
    state: &AppState,
    tenant_id: Uuid,
) -> Result<Option<i64>, LoginCheckError> {
    let pool = state.tenant_pools.pool_for(tenant_id).await?;
    let failures: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM audit_events \
         WHERE action = 'login_failed' AND occurred_at >= now() - make_interval(mins => $1)",
    )
    .bind(WINDOW_MINUTES)
    .fetch_one(&pool)
    .await?;

    if failures < MIN_LOGIN_FAILURES {
        return Ok(None);
    }

    Ok(Some(failures))
}
