use axum::extract::State;
use axum::http::StatusCode;
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_audit_queue::{
    begin_project_change, commit_project_change,
};
use crate::modules::tenants::audit::project_change::ProjectChange;
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
    let mut transaction = begin_project_change(&state.control_plane_pool, admin.tenant_id).await?;
    delete_smtp_settings(&mut transaction, admin.tenant_id).await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "smtp", "operation": "reset" }),
    };
    commit_project_change(&state, transaction, change).await?;

    Ok(StatusCode::NO_CONTENT)
}
