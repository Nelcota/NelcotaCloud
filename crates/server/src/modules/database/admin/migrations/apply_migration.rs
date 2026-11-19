use sha2::{Digest, Sha256};
use sqlx::PgPool;

use super::migration_record::MigrationRecord;
use super::migration_request::MigrationRequest;
use super::migration_session::MigrationSession;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::tenants::access::admin_actor::AdminActor;
use crate::shared::http::api_error::ApiError;

const FIND_MIGRATION: &str = "
SELECT version, name, applied_at, actor_account_id, checksum
FROM nelcota_migrations.applied
WHERE version = $1
";
const LATEST_VERSION: &str = "SELECT max(version) FROM nelcota_migrations.applied";
const RECORD_MIGRATION: &str = "
INSERT INTO nelcota_migrations.applied (version, name, checksum, actor_account_id)
VALUES ($1, $2, $3, $4)
RETURNING version, name, applied_at, actor_account_id
";

#[derive(sqlx::FromRow)]
struct StoredMigration {
    #[sqlx(flatten)]
    record: MigrationRecord,
    checksum: Vec<u8>,
}

pub enum MigrationOutcome {
    Applied(MigrationRecord),
    AlreadyApplied(MigrationRecord),
}

pub async fn apply_migration(
    pool: &PgPool,
    actor: AdminActor,
    request: MigrationRequest,
) -> Result<MigrationOutcome, ApiError> {
    // Session slots bound migrations independently so they leave pool capacity for Auth and
    // the timeout guard, and no settings from a script can reach another request.
    let mut connection = pool.acquire().await?.detach();
    let mut session = MigrationSession::open(&mut connection, pool).await?;
    let checksum = Sha256::digest(request.sql.as_bytes());
    let outcome = apply_in_session(&mut session, actor, (&request, checksum.as_slice())).await?;
    session.commit().await?;

    Ok(outcome)
}

async fn apply_in_session(
    session: &mut MigrationSession<'_>,
    actor: AdminActor,
    migration: (&MigrationRequest, &[u8]),
) -> Result<MigrationOutcome, ApiError> {
    let (request, checksum) = migration;
    let version = request.version;
    let existing = sqlx::query_as(FIND_MIGRATION)
        .bind(version)
        .fetch_optional(&mut *session.transaction)
        .await?;

    if let Some(existing) = existing {
        return verify_existing(existing, (&request.name, checksum));
    }

    verify_order(session, version).await?;
    session.execute(&request.sql).await?;
    let record = record_migration(session, actor, migration).await?;

    Ok(MigrationOutcome::Applied(record))
}

fn verify_existing(
    existing: StoredMigration,
    migration: (&str, &[u8]),
) -> Result<MigrationOutcome, ApiError> {
    let (name, checksum) = migration;
    let record = existing.record;

    if record.name != name || existing.checksum != checksum {
        return Err(DatabaseRejection::MigrationMismatch(record.version).into());
    }

    Ok(MigrationOutcome::AlreadyApplied(record))
}

async fn verify_order(session: &mut MigrationSession<'_>, version: i64) -> Result<(), ApiError> {
    let latest: Option<i64> = sqlx::query_scalar(LATEST_VERSION)
        .fetch_one(&mut *session.transaction)
        .await?;

    if let Some(latest) = latest.filter(|latest| *latest >= version) {
        return Err(DatabaseRejection::MigrationOutOfOrder { version, latest }.into());
    }

    Ok(())
}

async fn record_migration(
    session: &mut MigrationSession<'_>,
    actor: AdminActor,
    migration: (&MigrationRequest, &[u8]),
) -> Result<MigrationRecord, sqlx::Error> {
    let (request, checksum) = migration;
    let account_id = match actor {
        AdminActor::SecretKey => None,
        AdminActor::ConsoleAccount(account_id) => Some(account_id),
    };

    sqlx::query_as(RECORD_MIGRATION)
        .bind(request.version)
        .bind(&request.name)
        .bind(checksum)
        .bind(account_id)
        .fetch_one(&mut *session.transaction)
        .await
}
