use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
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
    state.smtp_settings_store().reset(admin.tenant_id).await?;

    Ok(StatusCode::NO_CONTENT)
}
