use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::database::admin::developer_sql::developer_session::DeveloperSession;
use crate::modules::database::admin::schema_overview::schema_overview_query::read_schema_overview;
use crate::modules::database::admin::schema_overview::schema_overview_view::SchemaOverview;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /database/v1/schema`: tables (columns, keys, row level security, policies) and
/// functions of the project's `public` schema.
#[utoipa::path(
    get,
    path = "/database/v1/schema",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "The schema", body = SchemaOverview),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_schema(
    State(state): State<AppState>,
    admin: TenantAdmin,
) -> Result<Json<SchemaOverview>, ApiError> {
    let mut session = DeveloperSession::open(&state.database_sessions(), admin.tenant_id).await?;
    let overview = read_schema_overview(&mut session.transaction)
        .await
        .map_err(ApiError::internal)?;
    session.commit().await?;

    Ok(Json(overview))
}
