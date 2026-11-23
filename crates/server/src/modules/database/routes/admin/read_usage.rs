use axum::Json;
use axum::extract::{Query, State};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::app_state::AppState;
use crate::modules::database::usage::usage_flush::flush_usage;
use crate::modules::database::usage::usage_period::UsagePeriod;
use crate::modules::database::usage::usage_report::read_usage_report;
use crate::modules::database::usage::usage_report_view::DataApiUsageReport;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct UsageQuery {
    /// `24h` (one point per hour), `7d` or `30d` (one per UTC day). `24h` by default.
    #[param(inline)]
    pub period: Option<UsagePeriod>,
}

/// `GET /database/v1/usage`: the project's Data API traffic, for the console's metrics.
#[utoipa::path(
    get,
    path = "/database/v1/usage",
    tag = "database-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(UsageQuery),
    responses(
        (status = 200, description = "Totals, a point per hour or day, and the busiest tables", body = DataApiUsageReport),
        (status = 400, description = "Unknown period", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_usage(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Query(query): Query<UsageQuery>,
) -> Result<Json<DataApiUsageReport>, ApiError> {
    let period = query.period.unwrap_or(UsagePeriod::Day);
    // This instance's latest responses count too, instead of waiting for the next flush.
    flush_usage(&state).await;
    let report = read_usage_report(&state.control_plane_pool, admin.tenant_id, period)
        .await
        .map_err(ApiError::internal)?;

    Ok(Json(report))
}
