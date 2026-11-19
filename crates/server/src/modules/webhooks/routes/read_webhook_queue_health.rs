use std::time::Duration;

use axum::Json;
use axum::extract::State;
use sqlx::PgPool;
use tokio::time::timeout;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::webhooks::health::queue_health::{QueueHealth, read_queue_health};
use crate::shared::http::api_error::{ApiError, ErrorBody};

const HEALTH_TIMEOUT: Duration = Duration::from_millis(650);

#[utoipa::path(
    get,
    path = "/auth/v1/admin/webhooks/queue-health",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Delivery queue health for the authorized project", body = QueueHealth),
        (status = 401, description = "Missing or invalid credentials", body = ErrorBody),
        (status = 403, description = "Project access denied", body = ErrorBody),
        (status = 429, description = "Too many queue reads for this project", body = ErrorBody),
        (status = 503, description = "Queue health is unavailable", body = ErrorBody),
    )
)]
pub async fn read_webhook_queue_health(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<QueueHealth>, ApiError> {
    let tenant_id = admin.tenant_id;
    state
        .rate_limits
        .webhook_queue_health
        .check(tenant_id, Uuid::nil())?;
    let tenant_pool = state.tenant_pools.pool_for(tenant_id).await;
    let pool = tenant_pool.map_err(ApiError::internal)?;

    match timeout(
        HEALTH_TIMEOUT,
        read_project_health(&state, &pool, tenant_id),
    )
    .await
    {
        Ok(result) => result.map(Json),
        Err(_) => Err(ApiError::ServiceBusy),
    }
}

async fn read_project_health(
    state: &AppState,
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<QueueHealth, ApiError> {
    let active_endpoints: Vec<Uuid> =
        sqlx::query_scalar("SELECT id FROM webhook_endpoints WHERE tenant_id = $1 AND is_enabled")
            .bind(tenant_id)
            .fetch_all(&state.control_plane_pool)
            .await?;

    match read_queue_health(pool, &active_endpoints).await {
        Ok(health) => Ok(health),
        Err(error)
            if error
                .as_database_error()
                .and_then(sqlx::error::DatabaseError::code)
                .as_deref()
                == Some("57014") =>
        {
            Err(ApiError::ServiceBusy)
        }
        Err(error) => Err(ApiError::internal(error)),
    }
}
