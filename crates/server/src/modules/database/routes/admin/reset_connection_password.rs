use axum::Json;
use axum::extract::State;
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::database::direct_connection::direct_connection_access::reset_connection_password as reset_password;
use crate::modules::database::direct_connection::direct_connection_view::NewConnectionPassword;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_audit_queue::{
    begin_project_change, commit_project_change,
};
use crate::modules::tenants::audit::project_change::ProjectChange;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `POST /database/v1/connection/password`: a new password for direct connections, shown only
/// in this response. The previous one stops working for new connections.
#[utoipa::path(
    post,
    path = "/database/v1/connection/password",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "The new password and connection string", body = NewConnectionPassword),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 409, description = "This server does not offer direct connections", body = ErrorBody),
    )
)]
pub async fn reset_connection_password(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<NewConnectionPassword>, ApiError> {
    let tenant_id = admin.tenant_id;
    let created = reset_password(&state, tenant_id).await?;
    let transaction = begin_project_change(&state.control_plane_pool, tenant_id).await?;
    let change = ProjectChange {
        tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "database_password" }),
    };
    commit_project_change(&state, transaction, change).await?;

    Ok(Json(created))
}
