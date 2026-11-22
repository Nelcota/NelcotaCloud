use std::str::FromStr;

use sqlx::error::DatabaseError;
use sqlx::postgres::{PgConnectOptions, PgConnection, PgPoolOptions};
use sqlx::{AssertSqlSafe, Connection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::postgres::authenticator_password::{
    MissingServerPassword, authenticator_password,
};
use crate::modules::tenants::postgres::database_role_setup::{
    CREATE_SHARED_ROLES, drop_tenant_role_statement, tenant_role_statements,
};
use crate::modules::tenants::postgres::database_roles::tenant_authenticator_role;
use crate::modules::tenants::postgres::runtime_roles::{
    TENANT_RUNTIME_ROLE, configure_runtime_roles, grant_tenant_runtime,
};
use crate::modules::tenants::postgres::tenant_migration::{
    TenantMigrationError, migrate_tenant_database,
};
use crate::modules::tenants::provisioning::tenant_repository::{find_tenant_id_by_slug, lock_slug};
use crate::modules::tenants::provisioning::tenant_slug::{InvalidTenantSlug, TenantSlug};

const MAINTENANCE_DATABASE: &str = "postgres";
const DUPLICATE_DATABASE_ERROR_CODE: &str = "42P04";
/// Two concurrent CREATE DATABASE of the same name can also fail on the catalog's unique index.
const UNIQUE_VIOLATION_ERROR_CODE: &str = "23505";
const MIGRATION_CONNECTIONS: u32 = 1;
/// Auth code reads its tables unqualified; they live in `auth`, never in a project's `public`.
const AUTH_SEARCH_PATH: &str = "auth";
/// Data API queries name tables of the project's `public` schema.
const DATA_API_SEARCH_PATH: &str = "public";

#[derive(Debug, thiserror::Error)]
pub enum TenantDatabaseError {
    #[error(transparent)]
    InvalidSlug(#[from] InvalidTenantSlug),
    #[error("a database for this tenant slug already exists")]
    AlreadyExists,
    #[error("database error while managing a tenant database: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Migration(#[from] TenantMigrationError),
    #[error(transparent)]
    Password(#[from] MissingServerPassword),
}

/// The Postgres server where tenant databases live: creates, migrates and drops them.
pub struct TenantDatabaseServer<'a> {
    base_url: &'a str,
    uses_runtime_role: bool,
}

impl<'a> TenantDatabaseServer<'a> {
    pub fn new(base_url: &'a str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/'),
            uses_runtime_role: false,
        }
    }

    pub fn with_runtime_role(mut self) -> Self {
        self.uses_runtime_role = true;
        self
    }

    pub async fn prepare_runtime_role(&self, password: &str) -> Result<(), sqlx::Error> {
        let options = self.database_options(MAINTENANCE_DATABASE)?;
        configure_runtime_roles(options, password).await
    }

    pub fn runtime_auth_options(
        &self,
        slug: &TenantSlug,
        password: &str,
    ) -> Result<PgConnectOptions, sqlx::Error> {
        Ok(self
            .auth_options(slug)?
            .username(TENANT_RUNTIME_ROLE)
            .password(password))
    }

    /// Built from the current configuration on every use, so changing the server address or
    /// credentials in `TENANT_DATABASE_BASE_URL` applies to every tenant.
    pub fn auth_options(&self, slug: &TenantSlug) -> Result<PgConnectOptions, sqlx::Error> {
        let options = self.database_options(&slug.database_name())?;

        Ok(options
            .application_name("nelcota-tenant-auth")
            .options([("search_path", AUTH_SEARCH_PATH)]))
    }

    /// Connects as the project's own authenticator role, which only acts through the role a
    /// request switches to, never as the server's administrator.
    pub fn data_api_options(
        &self,
        slug: &TenantSlug,
    ) -> Result<PgConnectOptions, TenantDatabaseError> {
        let password = authenticator_password(self.base_url, slug)?;
        let options = self.database_options(&slug.database_name())?;

        Ok(options
            .application_name("nelcota-data-api")
            .username(&tenant_authenticator_role(slug))
            .password(&password)
            .options([("search_path", DATA_API_SEARCH_PATH)]))
    }

    /// Creates the request roles shared by every project (once per server).
    pub async fn ensure_roles(&self) -> Result<(), sqlx::Error> {
        self.run_maintenance_statement(AssertSqlSafe(CREATE_SHARED_ROLES.to_owned()))
            .await
    }

    /// Creates or repairs the project's authenticator role, before its Data API pool opens.
    pub async fn ensure_tenant_role(&self, slug: &TenantSlug) -> Result<(), TenantDatabaseError> {
        let password = authenticator_password(self.base_url, slug)?;
        self.run_maintenance_statement(tenant_role_statements(slug, &password))
            .await?;

        Ok(())
    }

    pub async fn create_database(&self, slug: &TenantSlug) -> Result<(), TenantDatabaseError> {
        let database_name = slug.database_name();
        // Identifiers cannot be bound as parameters; TenantSlug only allows [a-z0-9_].
        let statement = format!("CREATE DATABASE \"{database_name}\"");
        self.run_maintenance_statement(AssertSqlSafe(statement))
            .await
            .map_err(map_duplicate_database)?;

        Ok(())
    }

    /// Backfills existing databases only while the slug still belongs to the expected project.
    pub async fn prepare_registered_database(
        &self,
        control: &PgPool,
        slug: &TenantSlug,
        tenant_id: Uuid,
    ) -> Result<bool, TenantDatabaseError> {
        let mut transaction = control.begin().await?;
        lock_slug(&mut transaction, slug).await?;

        if find_tenant_id_by_slug(&mut *transaction, slug).await? != Some(tenant_id) {
            return Ok(false);
        }

        self.migrate_database(slug, tenant_id).await?;
        transaction.commit().await?;

        Ok(true)
    }

    pub async fn migrate_database(
        &self,
        slug: &TenantSlug,
        tenant_id: Uuid,
    ) -> Result<(), TenantDatabaseError> {
        // Through a pool: `Migrator::run` on a bare connection yields a non-Send future.
        let tenant_pool = PgPoolOptions::new()
            .max_connections(MIGRATION_CONNECTIONS)
            .connect_with(self.auth_options(slug)?)
            .await?;
        let migration = self.migrate_with_pool(&tenant_pool, tenant_id).await;
        tenant_pool.close().await;
        migration?;

        if self.uses_runtime_role {
            self.ensure_tenant_role(slug).await?;
        }

        Ok(())
    }

    async fn migrate_with_pool(
        &self,
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<(), TenantDatabaseError> {
        migrate_tenant_database(pool).await?;
        let mut connection = pool.acquire().await?;
        sqlx::query(
            "INSERT INTO auth.tenant_identity (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING",
        )
        .bind(tenant_id)
        .execute(&mut *connection)
        .await?;
        ensure_database_identity(&mut connection, tenant_id).await?;
        drop(connection);

        if self.uses_runtime_role {
            grant_tenant_runtime(pool).await?;
        }

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
        self.run_maintenance_statement(AssertSqlSafe(statement))
            .await?;

        self.run_maintenance_statement(drop_tenant_role_statement(slug))
            .await
    }

    fn database_options(&self, database_name: &str) -> Result<PgConnectOptions, sqlx::Error> {
        PgConnectOptions::from_str(&format!("{}/{database_name}", self.base_url))
    }

    /// CREATE/DROP DATABASE cannot run inside the database being created or dropped, so they go
    /// through the server's maintenance database.
    async fn run_maintenance_statement(
        &self,
        statement: AssertSqlSafe<String>,
    ) -> Result<(), sqlx::Error> {
        let options = self.database_options(MAINTENANCE_DATABASE)?;
        let mut connection = PgConnection::connect_with(&options).await?;
        let execution = sqlx::raw_sql(statement).execute(&mut connection).await;
        connection.close().await?;
        execution?;

        Ok(())
    }
}

/// A pool can reconnect after its original database was dropped and the slug reused.
pub async fn ensure_database_identity(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    let actual: Option<Uuid> =
        sqlx::query_scalar("SELECT tenant_id FROM auth.tenant_identity WHERE singleton")
            .fetch_optional(connection)
            .await?;

    if actual != Some(tenant_id) {
        return Err(sqlx::Error::Protocol(
            "database does not belong to the requested project".to_owned(),
        ));
    }

    Ok(())
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
