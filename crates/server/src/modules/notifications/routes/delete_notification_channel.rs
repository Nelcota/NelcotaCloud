use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::notifications::channel::channel_repository::delete_channel;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/notifications/{channel_id}`: stops sending alerts there.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/notifications/{channel_id}",
    tag = "notifications",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("channel_id" = Uuid, Path, description = "Id of the channel")),
    responses(
        (status = 204, description = "Channel removed"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such channel in this project", body = ErrorBody),
    )
)]
pub async fn delete_notification_channel(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(channel_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let deleted = delete_channel(&state.control_plane_pool, (admin.tenant_id, channel_id))
        .await
        .map_err(ApiError::internal)?;

    if deleted == false {
        return Err(ApiError::NotFound("notification channel"));
    }

    Ok(StatusCode::NO_CONTENT)
}
