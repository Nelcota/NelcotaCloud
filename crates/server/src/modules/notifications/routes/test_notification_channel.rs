use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::notifications::alerts::alert_texts::test_text;
use crate::modules::notifications::delivery::alert_dispatch::send_to_channel;
use crate::modules::notifications::rejection::notifications_rejection::test_error_response;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /admin/notifications/{channel_id}/test`: sends a test alert to the channel now.
#[utoipa::path(
    post,
    path = "/auth/v1/admin/notifications/{channel_id}/test",
    tag = "notifications",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("channel_id" = Uuid, Path, description = "Id of the channel")),
    responses(
        (status = 204, description = "The channel accepted the test alert"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "No such channel in this project", body = ErrorBody),
        (status = 429, description = "Too many test alerts for this project", body = ErrorBody),
        (status = 502, description = "The email server or chat service refused it", body = ErrorBody),
    )
)]
pub async fn test_notification_channel(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(channel_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let tenant_id = admin.tenant_id;
    state
        .rate_limits
        .notification_tests
        .check(tenant_id, Uuid::nil())?;
    let project = load_tenant_settings(&state.control_plane_pool, tenant_id).await?;
    let draft = test_text((tenant_id, &project.name));
    send_to_channel(&state, (tenant_id, channel_id), &draft)
        .await
        .map_err(test_error_response)?;

    Ok(StatusCode::NO_CONTENT)
}
