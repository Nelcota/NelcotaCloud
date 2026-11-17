use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::webhooks::endpoint::webhook_endpoint_store::EndpointRequest;
use crate::modules::webhooks::endpoint::webhook_endpoint_view::WebhookEndpointWithSecret;
use crate::modules::webhooks::rejection::webhooks_rejection::endpoint_error_response;
use crate::modules::webhooks::routes::webhook_endpoint_body::WebhookEndpointBody;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /admin/webhooks`: a new endpoint and its signing secret, shown only in this answer.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/webhooks",
    tag = "webhooks",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = WebhookEndpointBody,
    responses(
        (status = 201, description = "Endpoint created; store its secret now", body = WebhookEndpointWithSecret),
        (status = 400, description = "Invalid or private URL, or no event types", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 409, description = "The project already has 5 endpoints", body = ErrorBody),
    )
)]
pub async fn create_webhook_endpoint(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(body): ValidatedJson<WebhookEndpointBody>,
) -> Result<(StatusCode, Json<WebhookEndpointWithSecret>), ApiError> {
    let request = EndpointRequest {
        url: &body.url,
        event_types: &body.event_types,
    };
    let created = state
        .webhook_endpoint_store()
        .create(admin.tenant_id, request)
        .await
        .map_err(endpoint_error_response)?;

    Ok((StatusCode::CREATED, Json(created)))
}
