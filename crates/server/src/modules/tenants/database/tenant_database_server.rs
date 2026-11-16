use sqlx::error::DatabaseError;
use sqlx::postgres::{PgConnection, PgPoolOptions};
use sqlx::{AssertSqlSafe, Connection};

use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::shared::database::migrators::TENANT_MIGRATOR;

const MAINTENANCE_DATABASE: &str = "postgres";
const DUPLICATE_DATABASE_ERROR_CODE: &str = "42P04";
/// Two concurrent CREATE DATABASE of the same name can also fail on the catalog's unique index.
const UNIQUE_VIOLATION_ERROR_CODE: &str = "23505";
const MIGRATION_CONNECTIONS: u32 = 1;

#[derive(Debug, thiserror::Error)]
pub enum TenantDatabaseError {
    #[error("a database for this tenant slug already exists")]
    AlreadyExists,
    #[error("database error while managing a tenant database: {0}")]
    Database(#[from] sqlx::Error),
    #[error("failed to migrate tenant database: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
}

/// The Postgres server where tenant databases live: creates, migrates and drops them.
pub struct TenantDatabaseServer<'a> {
    base_url: &'a str,
}

impl<'a> TenantDatabaseServer<'a> {
    pub fn new(base_url: &'a str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/'),
        }
    }

    /// Built from the current configuration on every use, so changing the server address or
    /// credentials in `TENANT_DATABASE_BASE_URL` applies to every tenant.
    pub fn database_url(&self, slug: &TenantSlug) -> String {
        format!("{}/{}", self.base_url, slug.database_name())
    }

    pub async fn create_database(&self, slug: &TenantSlug) -> Result<(), TenantDatabaseError> {
        let database_name = slug.database_name();
        // Identifiers cannot be bound as parameters; TenantSlug only allows [a-z0-9_].
        let statement = format!("CREATE DATABASE \"{database_name}\"");
        self.run_maintenance_statement(statement)
            .await
            .map_err(map_duplicate_database)?;

        Ok(())
    }

    pub async fn migrate_database(&self, slug: &TenantSlug) -> Result<(), TenantDatabaseError> {
        let database_url = self.database_url(slug);
        // Through a pool: `Migrator::run` on a bare connection yields a non-Send future.
        let tenant_pool = PgPoolOptions::new()
            .max_connections(MIGRATION_CONNECTIONS)
            .connect(&database_url)
            .await?;
        let migration = TENANT_MIGRATOR.run(&tenant_pool).await;
        tenant_pool.close().await;
        migration?;

        Ok(())
    }

    /// Best effort cleanup: a failure is logged, since the caller is already handling an error.
    pub async fn drop_database(&self, slug: &TenantSlug) {
        if let Err(error) = self.try_drop_database(slug).await {
            let database_name = slug.database_name();
            tracing::error!(%error, %database_name, "failed to drop tenant database");
        }
    }

    /// For callers that must not go on when the database is still there.
    pub async fn try_drop_database(&self, slug: &TenantSlug) -> Result<(), sqlx::Error> {
        let database_name = slug.database_name();
        let statement = format!("DROP DATABASE IF EXISTS \"{database_name}\" WITH (FORCE)");

        self.run_maintenance_statement(statement).await
    }

    /// CREATE/DROP DATABASE cannot run inside the database being created or dropped, so they go
    /// through the server's maintenance database.
    async fn run_maintenance_statement(&self, statement: String) -> Result<(), sqlx::Error> {
        let maintenance_url = format!("{}/{MAINTENANCE_DATABASE}", self.base_url);
        let mut connection = PgConnection::connect(&maintenance_url).await?;
        let execution = sqlx::raw_sql(AssertSqlSafe(statement))
            .execute(&mut connection)
            .await;
        connection.close().await?;
        execution?;

        Ok(())
    }
}

fn map_duplicate_database(error: sqlx::Error) -> TenantDatabaseError {
    let database_error = error.as_database_error();
    let error_code = database_error.and_then(DatabaseError::code);

    if error_code.is_some_and(|code| {
        code == DUPLICATE_DATABASE_ERROR_CODE || code == UNIQUE_VIOLATION_ERROR_CODE
    }) {
        return TenantDatabaseError::AlreadyExists;
    }

    TenantDatabaseError::Database(error)
}
