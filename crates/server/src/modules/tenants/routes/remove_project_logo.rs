use axum::extract::State;
use axum::http::StatusCode;
use serde_json::json;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_audit_queue::{
    begin_project_change, commit_project_change,
};
use crate::modules::tenants::audit::project_change::ProjectChange;
use crate::modules::tenants::logo::logo_repository::delete_logo;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/logo`: the project goes back to its mascot or initials; succeeds when there
/// was no logo.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/logo",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 204, description = "Logo removed"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 429, description = "Too many logo changes", body = ErrorBody),
    )
)]
pub async fn remove_project_logo(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<StatusCode, ApiError> {
    let tenant_id = admin.tenant_id;
    state
        .rate_limits
        .project_logo_changes
        .check(tenant_id, Uuid::nil())?;
    let mut transaction = begin_project_change(&state.control_plane_pool, tenant_id).await?;

    if delete_logo(&mut transaction, tenant_id).await? == false {
        return Ok(StatusCode::NO_CONTENT);
    }

    let change = ProjectChange {
        tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "logo", "operation": "remove" }),
    };
    commit_project_change(&state, transaction, change).await?;

    Ok(StatusCode::NO_CONTENT)
}
