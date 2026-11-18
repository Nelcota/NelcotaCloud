use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;

/// How many users used the project this month and the month before (calendar months, UTC).
///
/// A user counts as active in a month when they logged in or renewed a session in it, by any
/// method. Deleted users are no longer counted.
#[derive(Debug, Serialize, sqlx::FromRow, ToSchema)]
pub struct ProjectUsage {
    /// First instant of the current month (UTC).
    #[serde(with = "time::serde::rfc3339")]
    pub month_start: OffsetDateTime,
    pub active_users_this_month: i64,
    pub active_users_last_month: i64,
}

/// Each login and each refresh stores a refresh token, so the month's tokens name its users.
pub async fn project_usage(pool: &PgPool) -> Result<ProjectUsage, sqlx::Error> {
    sqlx::query_as(
        "WITH months AS (SELECT date_trunc('month', now(), 'UTC') AS this_month, date_trunc('month', now(), 'UTC') - interval '1 month' AS last_month) \
         SELECT months.this_month AS month_start, \
         (SELECT count(DISTINCT user_id) FROM refresh_tokens WHERE created_at >= months.this_month) AS active_users_this_month, \
         (SELECT count(DISTINCT user_id) FROM refresh_tokens WHERE created_at >= months.last_month AND created_at < months.this_month) AS active_users_last_month \
         FROM months",
    )
    .fetch_one(pool)
    .await
}
