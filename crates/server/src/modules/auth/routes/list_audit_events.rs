use axum::Json;
use axum::extract::Query;
use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;
use validator::Validate;

use crate::modules::auth::audit::audit_listing::{
    AuditPage, AuditQuery, list_audit_events as find_events,
};
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

const DEFAULT_PAGE_SIZE: usize = 50;

#[derive(Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct AuditListQuery {
    /// Only events about this user.
    pub user_id: Option<Uuid>,
    /// Only events older than this id (the previous page's `next_before`).
    #[validate(range(min = 1))]
    pub before: Option<i64>,
    #[validate(range(min = 1, max = 100))]
    pub limit: Option<usize>,
}

/// `GET /admin/audit-events`: the project's activity log, newest first, kept for 90 days.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/audit-events",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(AuditListQuery),
    responses(
        (status = 200, description = "One page of events", body = AuditPage),
        (status = 400, description = "Invalid user, cursor or limit", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_audit_events(
    admin: TenantAdminContext,
    Query(query): Query<AuditListQuery>,
) -> Result<Json<AuditPage>, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let audit_query = AuditQuery {
        user_id: query.user_id,
        before: query.before,
        page_size: query.limit.unwrap_or(DEFAULT_PAGE_SIZE),
    };
    let page = find_events(&admin.pool, &audit_query).await?;

    Ok(Json(page))
}
