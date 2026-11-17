use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::webhooks::endpoint::webhook_endpoint_repository::find_endpoint;
use crate::shared::http::api_error::ApiError;

/// The endpoint id comes from the URL: it must belong to the project of the request.
pub async fn require_endpoint(
    state: &AppState,
    tenant_id: Uuid,
    endpoint_id: Uuid,
) -> Result<(), ApiError> {
    let endpoint = find_endpoint(&state.control_plane_pool, tenant_id, endpoint_id).await?;

    if endpoint.is_none() {
        return Err(ApiError::NotFound("webhook endpoint"));
    }

    Ok(())
}
