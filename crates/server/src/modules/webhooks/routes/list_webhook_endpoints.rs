use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::webhooks::endpoint::webhook_endpoint_view::WebhookEndpointView;
use crate::modules::webhooks::rejection::webhooks_rejection::endpoint_error_response;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/webhooks`: the project's webhook endpoints, oldest first.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/webhooks",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "The endpoints", body = [WebhookEndpointView]),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_webhook_endpoints(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<Vec<WebhookEndpointView>>, ApiError> {
    let endpoints = state.webhook_endpoint_store().list(admin.tenant_id).await;

    Ok(Json(endpoints.map_err(endpoint_error_response)?))
}
