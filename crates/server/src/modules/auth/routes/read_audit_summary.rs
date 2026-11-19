use axum::Json;
use axum::extract::Query;
use serde::Deserialize;
use time::OffsetDateTime;
use utoipa::IntoParams;
use validator::Validate;

use crate::modules::auth::audit::audit_period::{AuditPeriod, PeriodParams};
use crate::modules::auth::audit::audit_summary::{AuditSummary, summarize_audit_events};
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

const DEFAULT_DAY_COUNT: i32 = 7;

#[derive(Debug, Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct AuditSummaryQuery {
    /// How many days back from now. The activity log keeps 90 days. Without a period, the
    /// last 7 days.
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
}

/// `GET /admin/audit-events/summary`: counts and the most refused IP addresses over a period.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/audit-events/summary",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(AuditSummaryQuery),
    responses(
        (status = 200, description = "The period's summary", body = AuditSummary),
        (status = 400, description = "Days outside 1 to 90, or an invalid range", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_audit_summary(
    admin: TenantAdminContext,
    Query(query): Query<AuditSummaryQuery>,
) -> Result<Json<AuditSummary>, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let period = AuditPeriod::parse(PeriodParams {
        days: query.days,
        from: query.from,
        to: query.to,
    })
    .map_err(ApiError::invalid_request)?;

    Ok(Json(
        summarize_audit_events(&admin.pool, default_period(period)).await?,
    ))
}

/// A summary always covers a bounded period: the last week unless one is asked for.
fn default_period(period: AuditPeriod) -> AuditPeriod {
    match period {
        AuditPeriod::Whole => AuditPeriod::LastDays(DEFAULT_DAY_COUNT),
        chosen => chosen,
    }
}

#[cfg(test)]
mod tests {
    use validator::Validate;

    use super::AuditSummaryQuery;

    fn is_valid(days: Option<i32>) -> bool {
        AuditSummaryQuery {
            days,
            from: None,
            to: None,
        }
        .validate()
        .is_ok()
    }

    #[test]
    fn accepts_one_to_ninety_days_or_none() {
        assert!(is_valid(None));
        assert!(is_valid(Some(1)));
        assert!(is_valid(Some(90)));
    }

    #[test]
    fn refuses_days_outside_the_kept_log() {
        assert!(is_valid(Some(0)) == false);
        assert!(is_valid(Some(91)) == false);
    }
}
