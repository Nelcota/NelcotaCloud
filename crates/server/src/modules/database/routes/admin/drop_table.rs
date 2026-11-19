use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::schema_change::apply_schema_change;
use crate::modules::database::admin::table_definition::table_ddl::drop_table_sql;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /database/v1/tables/{table}`: drops a table and its rows (refused while other
/// tables reference it).
#[utoipa::path(
    delete,
    path = "/database/v1/tables/{table}",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
    ),
    responses(
        (status = 204, description = "Table dropped"),
        (status = 400, description = "Invalid request, or refused by Postgres (its message)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn drop_table(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(table): Path<String>,
) -> Result<StatusCode, ApiError> {
    let statement = drop_table_sql(&table)?;
    apply_schema_change(&state.database_sessions(), admin.tenant_id, statement).await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SchemaChanged,
        details: json!({ "operation": "drop_table", "table": table }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(StatusCode::NO_CONTENT)
}
