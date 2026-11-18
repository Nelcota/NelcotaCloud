use axum::extract::{Path, State};
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::schema_change::apply_schema_change;
use crate::modules::database::admin::table_definition::table_ddl::drop_column_sql;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /database/v1/tables/{table}/columns/{column}`: drops a column and its values.
#[utoipa::path(
    delete,
    path = "/database/v1/tables/{table}/columns/{column}",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
        ("column" = String, Path, description = "Column of the table"),
    ),
    responses(
        (status = 204, description = "Column dropped"),
        (status = 400, description = "Invalid request, or refused by Postgres (its message)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn drop_column(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path((table, column)): Path<(String, String)>,
) -> Result<StatusCode, ApiError> {
    let statement = drop_column_sql(&table, &column)?;
    apply_schema_change(&state, admin.tenant_id, statement).await?;

    Ok(StatusCode::NO_CONTENT)
}
