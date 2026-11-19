use sqlx::PgPool;

use crate::shared::database::migrators::TENANT_MIGRATOR;

/// Tenant pools search only the `auth` schema, where the Auth tables live. Databases created
/// before it existed keep their migration history and Auth tables in `public`, and the
/// migrations still pending name those tables unqualified, so every table moves first, under a
/// lock. Such a database predates the Data API, so `public` holds no project tables yet.
const PREPARE_AUTH_SCHEMA: &str = "
SELECT pg_advisory_xact_lock(7120000002);
CREATE SCHEMA IF NOT EXISTS auth;
DO $prepare$
DECLARE
    table_name text;
BEGIN
    IF to_regclass('public._sqlx_migrations') IS NOT NULL
        AND to_regclass('auth._sqlx_migrations') IS NULL THEN
        FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA auth', table_name);
        END LOOP;
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
