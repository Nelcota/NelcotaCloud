use axum::Json;
use axum::extract::{Path, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::webhooks::endpoint::webhook_endpoint_store::EndpointUpdate;
use crate::modules::webhooks::endpoint::webhook_endpoint_view::WebhookEndpointView;
use crate::modules::webhooks::rejection::webhooks_rejection::endpoint_error_response;
use crate::modules::webhooks::routes::webhook_endpoint_body::WebhookEndpointChangesBody;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `PATCH /admin/webhooks/{endpoint_id}`: changes the URL, the events or whether it is enabled.
#[utoipa::path(
    patch,
    path = "/auth/v1/admin/webhooks/{endpoint_id}",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("endpoint_id" = Uuid, Path, description = "Id of the endpoint")),
    request_body = WebhookEndpointChangesBody,
    responses(
        (status = 200, description = "Endpoint saved", body = WebhookEndpointView),
        (status = 400, description = "Invalid or private URL, or no event types", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such endpoint in this project", body = ErrorBody),
    )
)]
pub async fn change_webhook_endpoint(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(endpoint_id): Path<Uuid>,
    ValidatedJson(body): ValidatedJson<WebhookEndpointChangesBody>,
) -> Result<Json<WebhookEndpointView>, ApiError> {
    let update = EndpointUpdate {
        url: body.url.as_deref(),
        event_types: body.event_types.as_deref(),
        is_enabled: body.is_enabled,
    };
    let saved = state
        .webhook_endpoint_store()
        .update((admin.tenant_id, endpoint_id), update)
        .await
        .map_err(endpoint_error_response)?;

    Ok(Json(saved))
}
