use axum::Json;
use axum::extract::{Path, State};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::webhooks::delivery::failed_delivery_requeue::requeue_failed_deliveries;
use crate::modules::webhooks::routes::endpoint_ownership::require_endpoint;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// How many given-up deliveries went back to the queue.
#[derive(Debug, Serialize, ToSchema)]
pub struct RequeuedDeliveries {
    pub queued: u64,
}

/// `POST /admin/webhooks/{endpoint_id}/deliveries/retry-failed`: sends every delivery that
/// gave up again, right away.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/webhooks/{endpoint_id}/deliveries/retry-failed",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("endpoint_id" = Uuid, Path, description = "Id of the endpoint")),
    responses(
        (status = 200, description = "Queued; they are sent within seconds", body = RequeuedDeliveries),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such endpoint in this project", body = ErrorBody),
        (status = 409, description = "The endpoint is disabled", body = ErrorBody),
        (status = 429, description = "Too many test events and resends for this project", body = ErrorBody),
    )
)]
pub async fn retry_failed_webhook_deliveries(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(endpoint_id): Path<Uuid>,
) -> Result<Json<RequeuedDeliveries>, ApiError> {
    let tenant_id = admin.tenant_id;
    let endpoint = require_endpoint(&state, tenant_id, endpoint_id).await?;

    // The worker would give them up again at once: a disabled endpoint receives nothing.
    if endpoint.is_enabled == false {
        return Err(ApiError::Conflict(
            "the endpoint is disabled: enable it to send deliveries again".to_owned(),
        ));
    }

    state.webhooks.manual_sends.check(tenant_id)?;
    let queued = requeue_failed_deliveries(&admin.pool, endpoint_id).await?;

    if queued > 0 {
        state.webhooks.hint(tenant_id);
    }

    Ok(Json(RequeuedDeliveries { queued }))
}
