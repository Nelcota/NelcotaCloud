use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::notifications::channel::channel_repository::list_channels;
use crate::modules::notifications::channel::notification_channel::NotificationChannelList;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/notifications`: where the project sends its alerts.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/notifications",
    tag = "notifications",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "The project's channels, oldest first", body = NotificationChannelList),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_notification_channels(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<NotificationChannelList>, ApiError> {
    let channels = list_channels(&state.control_plane_pool, admin.tenant_id)
        .await
        .map_err(ApiError::internal)?;

    Ok(Json(NotificationChannelList { channels }))
}
