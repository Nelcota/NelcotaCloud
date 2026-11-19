use axum::Json;
use axum::extract::{Query, State};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::app_state::AppState;
use crate::modules::auth::usage::monthly_active_users::ProjectUsage;
use crate::modules::auth::usage::project_usage_cache::read_fresh_usage;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ProjectUsageQuery {
    /// Allow a cached snapshot up to 30 seconds old.
    pub cached: Option<bool>,
}

/// `GET /admin/usage`: active users this month and last month.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/usage",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(ProjectUsageQuery),
    responses(
        (status = 200, description = "Monthly active users", body = ProjectUsage),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_project_usage(
    State(state): State<AppState>,
    admin: TenantAdminContext,
    Query(query): Query<ProjectUsageQuery>,
) -> Result<Json<ProjectUsage>, ApiError> {
    if query.cached != Some(true) {
        return Ok(Json(read_fresh_usage(&admin.pool).await?));
    }

    let usage = state
        .project_usage
        .read(admin.tenant_id, &admin.pool)
        .await
        .map_err(ApiError::internal)?;

    Ok(Json(usage))
}
