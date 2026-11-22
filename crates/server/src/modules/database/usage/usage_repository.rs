use std::collections::HashMap;

use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::database::usage::usage_entry::{UsageCounter, UsageKey};

/// How long the hourly rows are kept: the console shows at most the last 30 days.
const RETENTION_DAYS: i32 = 35;

/// Adds the counters to their hourly rows, every group in one statement.
pub async fn add_usage(
    pool: &PgPool,
    counters: &HashMap<UsageKey, UsageCounter>,
) -> Result<(), sqlx::Error> {
    if counters.is_empty() {
        return Ok(());
    }

    let columns = UsageColumns::from_counters(counters);
    sqlx::query(
        "INSERT INTO data_api_usage AS usage \
             (tenant_id, hour_start, resource, method, status, requests, duration_milliseconds) \
         SELECT tenant_id, to_timestamp(hour_start), resource, method, status, requests, duration \
         FROM unnest($1::uuid[], $2::bigint[], $3::text[], $4::text[], $5::smallint[], \
                     $6::bigint[], $7::bigint[]) \
             AS rows(tenant_id, hour_start, resource, method, status, requests, duration) \
         WHERE EXISTS (SELECT 1 FROM tenants WHERE tenants.id = rows.tenant_id) \
         ON CONFLICT (tenant_id, hour_start, resource, method, status) DO UPDATE SET \
             requests = usage.requests + excluded.requests, \
             duration_milliseconds = usage.duration_milliseconds + excluded.duration_milliseconds",
    )
    .bind(columns.tenant_ids)
    .bind(columns.hour_starts)
    .bind(columns.resources)
    .bind(columns.methods)
    .bind(columns.statuses)
    .bind(columns.requests)
    .bind(columns.durations)
    .execute(pool)
    .await?;

    Ok(())
}

/// Drops hours older than the retention, across projects.
pub async fn prune_usage(pool: &PgPool) -> Result<u64, sqlx::Error> {
    let deleted = sqlx::query(
        "DELETE FROM data_api_usage WHERE hour_start < now() - make_interval(days => $1)",
    )
    .bind(RETENTION_DAYS)
    .execute(pool)
    .await?;

    Ok(deleted.rows_affected())
}

/// The counters as parallel arrays, the shape `unnest` takes.
#[derive(Default)]
struct UsageColumns {
    tenant_ids: Vec<Uuid>,
    hour_starts: Vec<i64>,
    resources: Vec<String>,
    methods: Vec<String>,
    statuses: Vec<i16>,
    requests: Vec<i64>,
    durations: Vec<i64>,
}

impl UsageColumns {
    fn from_counters(counters: &HashMap<UsageKey, UsageCounter>) -> Self {
        let mut columns = Self::default();

        for (key, counter) in counters {
            // Statuses are three digits, so they always fit; anything else is not a status.
            let Ok(status) = i16::try_from(key.status) else {
                continue;
            };

            columns.tenant_ids.push(key.tenant_id);
            columns.hour_starts.push(key.hour_start);
            columns.resources.push(key.resource.clone());
            columns.methods.push(key.method.clone());
            columns.statuses.push(status);
            columns.requests.push(counter.requests);
            columns.durations.push(counter.duration_milliseconds);
        }

        columns
    }
}
