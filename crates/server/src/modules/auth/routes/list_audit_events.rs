use axum::Json;
use axum::extract::Query;
use serde::Deserialize;
use time::OffsetDateTime;
use utoipa::IntoParams;
use uuid::Uuid;
use validator::Validate;

use crate::modules::auth::audit::audit_kind::AuditKind;
use crate::modules::auth::audit::audit_listing::{AuditPage, list_audit_events as find_events};
use crate::modules::auth::audit::audit_period::{AuditPeriod, PeriodParams};
use crate::modules::auth::audit::audit_query::AuditQuery;
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::text::not_blank::check_not_blank;

const DEFAULT_PAGE_SIZE: usize = 50;

#[derive(Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct AuditListQuery {
    /// Only events about this user.
    pub user_id: Option<Uuid>,
    /// Only events of this kind.
    #[param(inline)]
    pub kind: Option<AuditKind>,
    /// Part of the email or IP address to search for.
    #[validate(length(min = 1, max = 254), custom(function = check_not_blank))]
    pub search: Option<String>,
    /// Only events of the last this many days. The log keeps 90.
    #[validate(range(min = 1, max = 90))]
    pub days: Option<i32>,
    /// Only events at or after this instant (RFC 3339). Pass with `to`, instead of `days`.
    #[serde(default, with = "time::serde::rfc3339::option")]
    #[param(value_type = Option<String>, format = DateTime)]
    pub from: Option<OffsetDateTime>,
    /// Only events before this instant (RFC 3339), at most 92 days after `from`.
    #[serde(default, with = "time::serde::rfc3339::option")]
    #[param(value_type = Option<String>, format = DateTime)]
    pub to: Option<OffsetDateTime>,
    /// Only events older than this id (the previous page's `next_before`).
    #[validate(range(min = 1))]
    pub before: Option<i64>,
    #[validate(range(min = 1, max = 100))]
    pub limit: Option<usize>,
}

/// `GET /admin/audit-events`: the project's activity log, newest first, kept for 90 days.
///
/// Optionally narrowed to one kind of event and searched by email or IP address.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/audit-events",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(AuditListQuery),
    responses(
        (status = 200, description = "One page of events", body = AuditPage),
        (status = 400, description = "Invalid user, kind, search, period, cursor or limit", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_audit_events(
    admin: TenantAdminContext,
    Query(query): Query<AuditListQuery>,
) -> Result<Json<AuditPage>, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let period = AuditPeriod::parse(PeriodParams {
        days: query.days,
        from: query.from,
        to: query.to,
    })
    .map_err(ApiError::invalid_request)?;
    let audit_query = AuditQuery {
        user_id: query.user_id,
        kind: query.kind,
        search: query.search.as_deref(),
        period,
        before: query.before,
    };
    let page_size = query.limit.unwrap_or(DEFAULT_PAGE_SIZE);
    let page = find_events(&admin.pool, &audit_query, page_size).await?;

    Ok(Json(page))
}
