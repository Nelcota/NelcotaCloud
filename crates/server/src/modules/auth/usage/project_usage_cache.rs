use std::sync::Arc;
use std::time::Duration;

use moka::future::Cache;
use sqlx::PgPool;
use time::{Month, OffsetDateTime};
use uuid::Uuid;

use crate::modules::auth::usage::monthly_active_users::{ProjectUsage, project_usage};

const MAX_PROJECT_MONTHS: u64 = 2_048;
const USAGE_TIME_TO_LIVE: Duration = Duration::from_secs(30);

#[derive(Clone)]
pub struct ProjectUsageCache {
    entries: Cache<(Uuid, i32, Month), ProjectUsage>,
}

impl Default for ProjectUsageCache {
    fn default() -> Self {
        Self {
            entries: Cache::builder()
                .max_capacity(MAX_PROJECT_MONTHS)
                .time_to_live(USAGE_TIME_TO_LIVE)
                .build(),
        }
    }
}

impl ProjectUsageCache {
    pub async fn read(
        &self,
        tenant_id: Uuid,
        pool: &PgPool,
    ) -> Result<ProjectUsage, Arc<sqlx::Error>> {
        let month_start = current_month();
        let key = (tenant_id, month_start.year(), month_start.month());

        self.entries
            .try_get_with(key, project_usage(pool, month_start))
            .await
    }
}

pub async fn read_fresh_usage(pool: &PgPool) -> Result<ProjectUsage, sqlx::Error> {
    project_usage(pool, current_month()).await
}

fn current_month() -> OffsetDateTime {
    let today = OffsetDateTime::now_utc().date();
    let days_since_start = i64::from(today.day().saturating_sub(1));
    let first_day = today.saturating_sub(time::Duration::days(days_since_start));

    first_day.midnight().assume_utc()
}
