use axum::extract::{Path, State};
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::schema_change::apply_schema_change;
use crate::modules::database::admin::policy::policy_definition::{
    CreatePolicyRequest, create_policy_sql,
};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// `POST /database/v1/tables/{table}/policies`: adds a row level security policy.
#[utoipa::path(
    post,
    path = "/database/v1/tables/{table}/policies",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(
        ("table" = String, Path, description = "Table of the public schema"),
    ),
    request_body = CreatePolicyRequest,
    responses(
        (status = 201, description = "Policy created"),
        (status = 400, description = "Invalid request, or refused by Postgres (its message)", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn create_policy(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(table): Path<String>,
    ValidatedJson(request): ValidatedJson<CreatePolicyRequest>,
) -> Result<StatusCode, ApiError> {
    let statement = create_policy_sql(&table, &request)?;
    apply_schema_change(&state, admin.tenant_id, statement).await?;

    Ok(StatusCode::CREATED)
}
