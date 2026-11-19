use axum::Json;
use axum::extract::Query;
use axum::extract::rejection::QueryRejection;
use validator::Validate;

use crate::modules::database::admin::migrations::migration_history::{
    MigrationHistory, read_migration_history,
};
use crate::modules::database::admin::migrations::migration_request::MigrationHistoryQuery;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// Lists applied SQL migrations, newest version first.
#[utoipa::path(
    get,
    path = "/database/v1/migrations",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(MigrationHistoryQuery),
    responses(
        (status = 200, description = "Applied migrations for the project", body = MigrationHistory),
        (status = 400, description = "Invalid history cursor", body = ErrorBody),
        (status = 401, description = "Missing or invalid credentials", body = ErrorBody),
        (status = 403, description = "Requires a secret API key or project membership", body = ErrorBody),
    )
)]
pub async fn list(
    context: TenantAdminContext,
    query: Result<Query<MigrationHistoryQuery>, QueryRejection>,
) -> Result<Json<MigrationHistory>, ApiError> {
    let Query(query) = query.map_err(ApiError::invalid_request)?;
    query.validate().map_err(ApiError::invalid_request)?;
    let history = read_migration_history(&context.pool, query.before).await?;

    Ok(Json(history))
}
