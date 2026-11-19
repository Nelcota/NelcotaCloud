use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::schema_change::apply_schema_change;
use crate::modules::database::admin::table_definition::table_change::ChangeTableRequest;
use crate::modules::database::admin::table_definition::table_ddl::row_level_security_sql;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `PATCH /database/v1/tables/{table}`: turns row level security on or off. Off, every
/// request role reaches every row its privileges allow.
#[utoipa::path(
    patch,
    path = "/database/v1/tables/{table}",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
    ),
    request_body = ChangeTableRequest,
    responses(
        (status = 204, description = "Table changed"),
        (status = 400, description = "Invalid request, or refused by Postgres (its message)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn change_table(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(table): Path<String>,
    ValidatedJson(request): ValidatedJson<ChangeTableRequest>,
) -> Result<StatusCode, ApiError> {
    let statement = row_level_security_sql(&table, request.rls_enabled)?;
    apply_schema_change(&state.database_sessions(), admin.tenant_id, statement).await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SchemaChanged,
        details: json!({ "operation": "change_table", "table": table, "rls_enabled": request.rls_enabled }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(StatusCode::NO_CONTENT)
}
