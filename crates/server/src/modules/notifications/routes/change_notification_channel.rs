use axum::Json;
use axum::extract::{Path, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::notifications::channel::channel_repository::change_channel_events;
use crate::modules::notifications::channel::notification_channel::NotificationChannel;
use crate::modules::notifications::routes::notification_channel_body::{
    ChannelEventsBody, distinct_events,
};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `PATCH /admin/notifications/{channel_id}`: which events the channel receives.
#[utoipa::path(
    patch,
    path = "/auth/v1/admin/notifications/{channel_id}",
    tag = "notifications",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("channel_id" = Uuid, Path, description = "Id of the channel")),
    request_body = ChannelEventsBody,
    responses(
        (status = 200, description = "Channel changed", body = NotificationChannel),
        (status = 400, description = "No events, or an unknown one", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such channel in this project", body = ErrorBody),
    )
)]
pub async fn change_notification_channel(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(channel_id): Path<Uuid>,
    ValidatedJson(body): ValidatedJson<ChannelEventsBody>,
) -> Result<Json<NotificationChannel>, ApiError> {
    let events = distinct_events(&body.events);
    let target = (admin.tenant_id, channel_id);
    let changed = change_channel_events(&state.control_plane_pool, target, &events)
        .await
        .map_err(ApiError::internal)?
        .ok_or(ApiError::NotFound("notification channel"))?;

    Ok(Json(changed))
}
