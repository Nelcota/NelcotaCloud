use axum::Json;
use axum::extract::Query;
use serde::Deserialize;
use utoipa::IntoParams;
use validator::Validate;

use crate::modules::auth::usage::daily_activity::{DailyUsage, daily_activity};
use crate::modules::tenants::access::tenant_admin_context::TenantAdminContext;
use crate::shared::http::api_error::{ApiError, ErrorBody};

const DEFAULT_DAY_COUNT: i32 = 30;

#[derive(Debug, Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct DailyUsageQuery {
    /// How many days, ending today (UTC). The activity log keeps logins for 90 days.
    #[validate(range(min = 1, max = 90))]
    pub days: Option<i32>,
}

/// `GET /admin/usage/daily`: logins and sign-ups per UTC day, for the console's chart.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/usage/daily",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(DailyUsageQuery),
    responses(
        (status = 200, description = "One entry per day, oldest first", body = DailyUsage),
        (status = 400, description = "Days outside 1 to 90", body = ErrorBody),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn read_daily_usage(
    admin: TenantAdminContext,
    Query(query): Query<DailyUsageQuery>,
) -> Result<Json<DailyUsage>, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let day_count = query.days.unwrap_or(DEFAULT_DAY_COUNT);

    Ok(Json(daily_activity(&admin.pool, day_count).await?))
}

#[cfg(test)]
mod tests {
    use validator::Validate;

    use super::DailyUsageQuery;

    fn is_valid(days: Option<i32>) -> bool {
        DailyUsageQuery { days }.validate().is_ok()
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
        assert!(is_valid(Some(-3)) == false);
        assert!(is_valid(Some(91)) == false);
    }
}
