use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::schema_change::apply_schema_change;
use crate::modules::database::admin::table_definition::column_definition::ColumnDefinition;
use crate::modules::database::admin::table_definition::table_ddl::add_column_sql;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /database/v1/tables/{table}/columns`: adds a column.
#[utoipa::path(
    post,
    path = "/database/v1/tables/{table}/columns",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
    ),
    request_body = ColumnDefinition,
    responses(
        (status = 201, description = "Column added"),
        (status = 400, description = "Invalid request, or refused by Postgres (its message)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn add_column(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(table): Path<String>,
    ValidatedJson(request): ValidatedJson<ColumnDefinition>,
) -> Result<StatusCode, ApiError> {
    let statement = add_column_sql(&table, &request)?;
    apply_schema_change(&state.database_sessions(), admin.tenant_id, statement).await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SchemaChanged,
        details: json!({ "operation": "add_column", "table": table, "column": request.name }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(StatusCode::CREATED)
}
