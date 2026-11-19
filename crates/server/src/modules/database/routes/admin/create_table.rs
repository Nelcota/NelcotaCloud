use axum::extract::State;
use axum::http::StatusCode;
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::schema_change::apply_schema_change;
use crate::modules::database::admin::table_definition::table_ddl::{
    CreateTableRequest, create_table_sql,
};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /database/v1/tables`: creates a table in the project's `public` schema, with row
/// level security on.
#[utoipa::path(
    post,
    path = "/database/v1/tables",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = CreateTableRequest,
    responses(
        (status = 201, description = "Table created"),
        (status = 400, description = "Invalid request, or refused by Postgres (its message)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn create_table(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(request): ValidatedJson<CreateTableRequest>,
) -> Result<StatusCode, ApiError> {
    let statement = create_table_sql(&request)?;
    apply_schema_change(&state.database_sessions(), admin.tenant_id, statement).await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SchemaChanged,
        details: json!({ "operation": "create_table", "table": request.name }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(StatusCode::CREATED)
}
