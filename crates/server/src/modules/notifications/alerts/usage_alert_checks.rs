use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::storage::catalog::quota::{MAX_PROJECT_OBJECTS, PROJECT_BYTES};

/// At least this many server errors in the last hour, and at least 5% of the requests.
const MIN_SERVER_ERRORS: i64 = 20;
const SERVER_ERROR_PERCENT: i64 = 5;
/// Storage alerts once a project uses this share of its bytes or files.
const STORAGE_ALERT_PERCENT: i64 = 80;

/// A project whose Data API failed too often in the last hour.
#[derive(Debug, sqlx::FromRow)]
pub struct DataApiErrorSpike {
    pub tenant_id: Uuid,
    pub requests: i64,
    pub server_errors: i64,
}

/// Reads the hourly counters of the current and the previous hour.
pub async fn data_api_error_spikes(
    pool: &PgPool,
    tenant_ids: &[Uuid],
) -> Result<Vec<DataApiErrorSpike>, sqlx::Error> {
    sqlx::query_as(
        "SELECT tenant_id, sum(requests)::bigint AS requests, \
                coalesce(sum(requests) FILTER (WHERE status >= 500), 0)::bigint AS server_errors \
         FROM data_api_usage \
         WHERE tenant_id = ANY ($1) AND hour_start >= date_trunc('hour', now()) - interval '1 hour' \
         GROUP BY tenant_id \
         HAVING coalesce(sum(requests) FILTER (WHERE status >= 500), 0) >= $2 \
            AND coalesce(sum(requests) FILTER (WHERE status >= 500), 0) * 100 >= sum(requests) * $3",
    )
    .bind(tenant_ids)
    .bind(MIN_SERVER_ERRORS)
    .bind(SERVER_ERROR_PERCENT)
    .fetch_all(pool)
    .await
}

/// A project whose files take most of its storage.
#[derive(Debug, sqlx::FromRow)]
pub struct StorageUse {
    pub tenant_id: Uuid,
    pub bytes: i64,
    pub files: i64,
}

pub async fn storage_near_limit(
    pool: &PgPool,
    tenant_ids: &[Uuid],
) -> Result<Vec<StorageUse>, sqlx::Error> {
    sqlx::query_as(
        "SELECT tenant_id, coalesce(sum(size_bytes), 0)::bigint AS bytes, count(*) AS files \
         FROM storage_objects WHERE tenant_id = ANY ($1) GROUP BY tenant_id \
         HAVING coalesce(sum(size_bytes), 0) * 100 >= $2::bigint * $4 \
             OR count(*) * 100 >= $3::bigint * $4",
    )
    .bind(tenant_ids)
    .bind(PROJECT_BYTES)
    .bind(MAX_PROJECT_OBJECTS)
    .bind(STORAGE_ALERT_PERCENT)
    .fetch_all(pool)
    .await
}

/// Whole percent of `part` in `total`, for the alert text.
pub fn percent_of(part: i64, total: i64) -> i64 {
    if total <= 0 {
        return 0;
    }

    part.saturating_mul(100).checked_div(total).unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percents_round_down_and_survive_zero() {
        assert_eq!(percent_of(1, 3), 33);
        assert_eq!(percent_of(5, 0), 0);
        assert_eq!(percent_of(10, 10), 100);
    }
}
