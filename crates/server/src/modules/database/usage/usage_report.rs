use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::database::usage::usage_period::UsagePeriod;
use crate::modules::database::usage::usage_report_view::DataApiUsageReport;

/// `$2` is the unit (`hour`, `day`), `$3` one step of it, `$4` the number of points. Hours and
/// days are UTC: timestamps are converted before `date_trunc`.
const REPORT: &str = r#"
WITH bounds AS (
    SELECT date_trunc($2, now() AT TIME ZONE 'UTC') AS last_point,
           date_trunc($2, now() AT TIME ZONE 'UTC') - $3::interval * ($4 - 1) AS first_point
),
traffic AS (
    SELECT date_trunc($2, usage.hour_start AT TIME ZONE 'UTC') AS point, usage.resource,
           usage.method, usage.status, usage.requests, usage.duration_milliseconds
    FROM data_api_usage AS usage, bounds
    WHERE usage.tenant_id = $1 AND usage.hour_start >= bounds.first_point AT TIME ZONE 'UTC'
),
points AS (
    SELECT generate_series(first_point, last_point, $3::interval) AS point FROM bounds
),
point_totals AS (
    SELECT point, sum(requests) AS requests,
           sum(requests) FILTER (WHERE status BETWEEN 400 AND 499) AS client_errors,
           sum(requests) FILTER (WHERE status >= 500) AS server_errors
    FROM traffic GROUP BY point
),
busiest AS (
    SELECT resource, sum(requests) AS requests,
           coalesce(sum(requests) FILTER (WHERE status BETWEEN 400 AND 499), 0) AS client_errors,
           coalesce(sum(requests) FILTER (WHERE status >= 500), 0) AS server_errors,
           sum(duration_milliseconds) AS duration_milliseconds
    FROM traffic GROUP BY resource ORDER BY sum(requests) DESC, resource LIMIT 10
),
by_status AS (
    SELECT status, sum(requests) AS requests FROM traffic
    GROUP BY status ORDER BY sum(requests) DESC, status LIMIT 10
),
by_method AS (
    SELECT method, sum(requests) AS requests FROM traffic GROUP BY method
)
SELECT json_build_object(
    'requests', (SELECT coalesce(sum(requests), 0) FROM traffic),
    'client_errors', (SELECT coalesce(sum(requests), 0) FROM traffic WHERE status BETWEEN 400 AND 499),
    'server_errors', (SELECT coalesce(sum(requests), 0) FROM traffic WHERE status >= 500),
    'duration_milliseconds', (SELECT coalesce(sum(duration_milliseconds), 0) FROM traffic),
    'series', (
        SELECT json_agg(json_build_object(
            'start', to_char(points.point, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'requests', coalesce(point_totals.requests, 0),
            'client_errors', coalesce(point_totals.client_errors, 0),
            'server_errors', coalesce(point_totals.server_errors, 0)
        ) ORDER BY points.point)
        FROM points LEFT JOIN point_totals USING (point)
    ),
    'resources', (
        SELECT coalesce(json_agg(json_build_object(
            'name', resource, 'requests', requests, 'client_errors', client_errors,
            'server_errors', server_errors, 'duration_milliseconds', duration_milliseconds
        ) ORDER BY requests DESC, resource), '[]')
        FROM busiest
    ),
    'statuses', (
        SELECT coalesce(json_agg(json_build_object('status', status, 'requests', requests)
            ORDER BY requests DESC, status), '[]')
        FROM by_status
    ),
    'methods', (
        SELECT coalesce(json_agg(json_build_object('method', method, 'requests', requests)
            ORDER BY requests DESC, method), '[]')
        FROM by_method
    )
)::text
"#;

#[derive(Debug, thiserror::Error)]
pub enum UsageReportError {
    #[error("failed to read the Data API usage: {0}")]
    Database(#[from] sqlx::Error),
    #[error("the Data API usage has an unexpected shape: {0}")]
    Shape(#[from] serde_json::Error),
}

pub async fn read_usage_report(
    pool: &PgPool,
    tenant_id: Uuid,
    period: UsagePeriod,
) -> Result<DataApiUsageReport, UsageReportError> {
    let report: String = sqlx::query_scalar(REPORT)
        .bind(tenant_id)
        .bind(period.unit())
        .bind(format!("1 {}", period.unit()))
        .bind(period.points())
        .fetch_one(pool)
        .await?;

    Ok(serde_json::from_str(&report)?)
}
