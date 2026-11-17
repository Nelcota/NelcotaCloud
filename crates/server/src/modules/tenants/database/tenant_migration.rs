use sqlx::PgPool;

use crate::shared::database::migrators::TENANT_MIGRATOR;

/// Tenant pools search only the `auth` schema, where the Auth tables live. Databases created
/// before it existed keep their migration history in `public`; it moves first, under a lock,
/// so the migrator finds it (the migration that follows moves the remaining tables).
const PREPARE_AUTH_SCHEMA: &str = "
SELECT pg_advisory_xact_lock(7120000002);
CREATE SCHEMA IF NOT EXISTS auth;
DO $prepare$
BEGIN
    IF to_regclass('public._sqlx_migrations') IS NOT NULL
        AND to_regclass('auth._sqlx_migrations') IS NULL THEN
        ALTER TABLE public._sqlx_migrations SET SCHEMA auth;
    END IF;
END
$prepare$;
";

#[derive(Debug, thiserror::Error)]
pub enum TenantMigrationError {
    #[error("database error while preparing a tenant database: {0}")]
    Database(#[from] sqlx::Error),
    #[error("failed to migrate tenant database: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
}

/// Brings a tenant database (through a pool searching `auth`) up to the latest schema.
pub async fn migrate_tenant_database(pool: &PgPool) -> Result<(), TenantMigrationError> {
    sqlx::raw_sql(PREPARE_AUTH_SCHEMA).execute(pool).await?;
    TENANT_MIGRATOR.run(pool).await?;

    Ok(())
}
