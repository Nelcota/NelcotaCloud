use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::notifications::channel::channel_repository::{NewChannel, insert_channel};
use crate::modules::notifications::channel::channel_target::parse_target;
use crate::modules::notifications::channel::notification_channel::{
    NotificationChannel, target_context,
};
use crate::modules::notifications::rejection::notifications_rejection::NotificationsRejection;
use crate::modules::notifications::routes::notification_channel_body::{
    NewChannelBody, distinct_events,
};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /admin/notifications`: adds an email address or a Discord or Slack webhook.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/notifications",
    tag = "notifications",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = NewChannelBody,
    responses(
        (status = 201, description = "Channel added", body = NotificationChannel),
        (status = 400, description = "Invalid address, or a URL outside Discord and Slack", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 409, description = "The project already has 5 channels", body = ErrorBody),
    )
)]
pub async fn create_notification_channel(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(body): ValidatedJson<NewChannelBody>,
) -> Result<(StatusCode, Json<NotificationChannel>), ApiError> {
    let tenant_id = admin.tenant_id;
    let target = parse_target(body.kind, &body.target).map_err(ApiError::invalid_request)?;
    let channel_id = Uuid::new_v4();
    let sealed = state
        .secret_box
        .seal(
            target.value.as_bytes(),
            &target_context(tenant_id, channel_id),
        )
        .map_err(ApiError::internal)?;
    let events = distinct_events(&body.events);
    let channel = NewChannel {
        id: channel_id,
        tenant_id,
        kind: target.kind,
        sealed_target: &sealed,
        hint: &target.hint,
        events: &events,
    };
    let created = insert_channel(&state.control_plane_pool, channel)
        .await
        .map_err(ApiError::internal)?
        .ok_or(NotificationsRejection::ChannelLimitReached)?;

    Ok((StatusCode::CREATED, Json(created)))
}
