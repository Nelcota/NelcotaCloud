use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::schema_change::apply_schema_change;
use crate::modules::database::admin::policy::policy_definition::drop_policy_sql;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /database/v1/tables/{table}/policies/{policy}`: removes a policy.
#[utoipa::path(
    delete,
    path = "/database/v1/tables/{table}/policies/{policy}",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
        ("policy" = String, Path, description = "Policy of the table"),
    ),
    responses(
        (status = 204, description = "Policy removed"),
        (status = 400, description = "Invalid request, or refused by Postgres (its message)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn drop_policy(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path((table, policy)): Path<(String, String)>,
) -> Result<StatusCode, ApiError> {
    let statement = drop_policy_sql(&table, &policy)?;
    apply_schema_change(&state.database_sessions(), admin.tenant_id, statement).await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SchemaChanged,
        details: json!({ "operation": "drop_policy", "table": table, "policy": policy }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(StatusCode::NO_CONTENT)
}
