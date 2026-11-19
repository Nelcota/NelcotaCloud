use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;

use super::migration_record::MigrationRecord;

const PAGE_SIZE: usize = 50;
const HISTORY: &str = "
SELECT version, name, applied_at, actor_account_id
FROM nelcota_migrations.applied
WHERE version <= $1
ORDER BY version DESC
LIMIT 51
";

#[derive(Serialize, ToSchema)]
pub struct MigrationHistory {
    pub migrations: Vec<MigrationRecord>,
    /// Use as before to read the next page, or null when there are no older entries.
    pub next_before: Option<i64>,
}

pub async fn read_migration_history(
    pool: &PgPool,
    before: Option<i64>,
) -> Result<MigrationHistory, sqlx::Error> {
    let max_version = before.map_or(i64::MAX, |version| version.saturating_sub(1));
    let mut migrations = sqlx::query_as(HISTORY)
        .bind(max_version)
        .fetch_all(pool)
        .await?;
    let next_before = page_cursor(&mut migrations);

    Ok(MigrationHistory {
        migrations,
        next_before,
    })
}

fn page_cursor(migrations: &mut Vec<MigrationRecord>) -> Option<i64> {
    if migrations.len() <= PAGE_SIZE {
        return None;
    }

    migrations.truncate(PAGE_SIZE);
    migrations.last().map(|record| record.version)
}
