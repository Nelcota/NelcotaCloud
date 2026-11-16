use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::smtp::smtp_settings_repository::delete_smtp_settings;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/smtp`: auth emails go through the platform's SMTP server again.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/smtp",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 204, description = "Back to the platform's SMTP server"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn reset_smtp(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<StatusCode, ApiError> {
    let tenant_id = admin.tenant_id;
    delete_smtp_settings(&state.control_plane_pool, tenant_id)
        .await
        .map_err(ApiError::internal)?;
    state.email_senders.forget(tenant_id).await;

    Ok(StatusCode::NO_CONTENT)
}
