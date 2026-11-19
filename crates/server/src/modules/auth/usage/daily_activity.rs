use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;

/// Logins and sign-ups in one UTC calendar day.
#[derive(Debug, Serialize, sqlx::FromRow, ToSchema)]
pub struct DailyActivity {
    /// The UTC day, as `YYYY-MM-DD`.
    #[schema(format = Date)]
    pub date: String,
    /// Successful logins by any method (several by one user count apart); renewals are not logins.
    pub logins: i64,
    /// Accounts created that day and not deleted since.
    pub sign_ups: i64,
}

/// The last days up to today (UTC), oldest first, with every day present even when empty.
#[derive(Debug, Serialize, ToSchema)]
pub struct DailyUsage {
    pub days: Vec<DailyActivity>,
}

/// Logins come from the activity log, so they reach back as far as it keeps events (90 days).
pub async fn daily_activity(pool: &PgPool, day_count: i32) -> Result<DailyUsage, sqlx::Error> {
    let days = sqlx::query_as(
        "WITH bounds AS (SELECT (now() AT TIME ZONE 'UTC')::date AS today), \
         window_start AS (SELECT today - ($1::int - 1) AS first_day, ((today - ($1::int - 1))::timestamp AT TIME ZONE 'UTC') AS first_instant FROM bounds), \
         days AS (SELECT generate_series(first_day, today, interval '1 day')::date AS day FROM bounds, window_start), \
         logins AS (SELECT (occurred_at AT TIME ZONE 'UTC')::date AS day, count(*) AS total FROM audit_events, window_start WHERE action = 'logged_in' AND occurred_at >= first_instant GROUP BY 1), \
         sign_ups AS (SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS total FROM users, window_start WHERE created_at >= first_instant GROUP BY 1) \
         SELECT to_char(days.day, 'YYYY-MM-DD') AS date, COALESCE(logins.total, 0) AS logins, COALESCE(sign_ups.total, 0) AS sign_ups \
         FROM days LEFT JOIN logins USING (day) LEFT JOIN sign_ups USING (day) ORDER BY days.day",
    )
    .bind(day_count)
    .fetch_all(pool)
    .await?;

    Ok(DailyUsage { days })
}
