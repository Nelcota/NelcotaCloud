use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::webhooks::delivery::delivery_queue_repository::ORPHANED_ERROR;

const COUNT_LIMIT: i64 = 10_000;
const COUNT_PROBE_LIMIT: i64 = 10_001;

#[derive(Serialize, ToSchema)]
pub struct QueueCount {
    pub value: i64,
    /// When true, the actual count exceeds `value`.
    pub is_capped: bool,
}

impl From<i64> for QueueCount {
    fn from(count: i64) -> Self {
        Self {
            value: count.min(COUNT_LIMIT),
            is_capped: count > COUNT_LIMIT,
        }
    }
}

#[derive(Serialize, ToSchema)]
pub struct QueueHealth {
    #[serde(with = "time::serde::rfc3339")]
    pub observed_at: OffsetDateTime,
    pub active_endpoints: usize,
    pub pending: QueueCount,
    pub overdue: QueueCount,
    pub oldest_overdue_seconds: Option<i64>,
    pub failed_last_day: QueueCount,
}

#[derive(sqlx::FromRow)]
struct QueueObservation {
    observed_at: OffsetDateTime,
    pending: i64,
    overdue: i64,
    oldest_overdue_seconds: Option<i64>,
    failed_last_day: i64,
}

pub async fn read_queue_health(
    pool: &PgPool,
    active_endpoints: &[Uuid],
) -> Result<QueueHealth, sqlx::Error> {
    let mut read = pool.begin_with("BEGIN READ ONLY").await?;
    sqlx::query("SET LOCAL statement_timeout = '350ms'")
        .execute(&mut *read)
        .await?;
    let observed: QueueObservation = sqlx::query_as(include_str!("queue_health.sql"))
        .bind(active_endpoints)
        .bind(COUNT_PROBE_LIMIT)
        .bind(ORPHANED_ERROR)
        .fetch_one(&mut *read)
        .await?;
    read.commit().await?;

    Ok(QueueHealth {
        observed_at: observed.observed_at,
        active_endpoints: active_endpoints.len(),
        pending: observed.pending.into(),
        overdue: observed.overdue.into(),
        oldest_overdue_seconds: observed.oldest_overdue_seconds,
        failed_last_day: observed.failed_last_day.into(),
    })
}
