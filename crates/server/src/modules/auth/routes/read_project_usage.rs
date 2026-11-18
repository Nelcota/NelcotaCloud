use axum::Json;

use crate::modules::auth::usage::monthly_active_users::{ProjectUsage, project_usage};
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /admin/usage`: active users this month and last month.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/usage",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "Monthly active users", body = ProjectUsage),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_project_usage(admin: TenantAdminContext) -> Result<Json<ProjectUsage>, ApiError> {
    Ok(Json(project_usage(&admin.pool).await?))
}
