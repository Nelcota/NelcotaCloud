use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::modules::webhooks::delivery::delivery_log_repository::{
    DeliveryLogEntry, DeliveryLogQuery, DeliveryStatus, list_deliveries,
};
use crate::modules::webhooks::routes::endpoint_ownership::require_endpoint;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// The newest deliveries are what owners look at when a receiver misbehaves.
const DEFAULT_PAGE_SIZE: i64 = 50;

#[derive(Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct DeliveryLogParams {
    /// Only deliveries in this state.
    #[param(inline)]
    pub status: Option<DeliveryStatus>,
    /// Only deliveries older than this one (the last delivery of the previous page).
    pub before: Option<Uuid>,
    #[validate(range(min = 1, max = 100))]
    pub limit: Option<i64>,
}

/// `GET /admin/webhooks/{endpoint_id}/deliveries`: the endpoint's deliveries, newest first, 50
/// at a time; deliveries are kept for 7 days.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/webhooks/{endpoint_id}/deliveries",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("endpoint_id" = Uuid, Path, description = "Id of the endpoint"), DeliveryLogParams),
    responses(
        (status = 200, description = "Newest deliveries first", body = [DeliveryLogEntry]),
        (status = 400, description = "Invalid state, cursor or limit", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such endpoint in this project", body = ErrorBody),
    )
)]
pub async fn list_webhook_deliveries(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Path(endpoint_id): Path<Uuid>,
    Query(params): Query<DeliveryLogParams>,
) -> Result<Json<Vec<DeliveryLogEntry>>, ApiError> {
    params.validate().map_err(ApiError::invalid_request)?;
    require_endpoint(&state, admin.tenant_id, endpoint_id).await?;
    let query = DeliveryLogQuery {
        endpoint_id,
        status: params.status,
        before: params.before,
        limit: params.limit.unwrap_or(DEFAULT_PAGE_SIZE),
    };
    let deliveries = list_deliveries(&admin.pool, query).await?;

    Ok(Json(deliveries))
}
