use sqlx::postgres::{PgConnection, PgPoolOptions};
use sqlx::{AssertSqlSafe, Connection, PgPool};
use uuid::Uuid;

use crate::control_plane::api_key_kind::ApiKeyKind;
use crate::control_plane::api_key_repository::{ApiKeyOwner, insert_api_key};
use crate::control_plane::signing_key::{SigningKey, SigningKeyError};
use crate::control_plane::signing_key_repository::{SealedSigningKey, insert_active_signing_key};
use crate::control_plane::site_url::SiteUrl;
use crate::control_plane::tenant_repository::{NewTenant, insert_tenant, slug_exists};
use crate::control_plane::tenant_slug::TenantSlug;
use crate::crypto::opaque_token::OpaqueToken;
use crate::crypto::secret_box::{SecretBox, SecretBoxError};
use crate::tenant_database::migrators::TENANT_MIGRATOR;

const MAINTENANCE_DATABASE: &str = "postgres";
const DUPLICATE_DATABASE_ERROR_CODE: &str = "42P04";
const MIGRATION_CONNECTIONS: u32 = 1;

#[derive(Debug, thiserror::Error)]
pub enum ProvisioningError {
    #[error("tenant slug is already taken")]
    SlugTaken,
    #[error("database error while provisioning tenant: {0}")]
    Database(#[from] sqlx::Error),
    #[error("failed to migrate tenant database: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error(transparent)]
    SigningKey(#[from] SigningKeyError),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
}

pub struct TenantProvisioner<'a> {
    pub control_plane_pool: &'a PgPool,
    pub secret_box: &'a SecretBox,
    pub tenant_database_base_url: &'a str,
}

pub struct NewTenantRequest {
    pub slug: TenantSlug,
    pub name: String,
    pub site_url: SiteUrl,
    pub require_email_verification: bool,
}

/// API keys are returned in plaintext only here; afterwards only their hashes exist.
pub struct ProvisionedTenant {
    pub tenant_id: Uuid,
    pub slug: TenantSlug,
    pub publishable_key: String,
    pub secret_key: String,
}

impl TenantProvisioner<'_> {
    pub async fn provision(
        &self,
        request: NewTenantRequest,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        if slug_exists(self.control_plane_pool, &request.slug).await? {
            return Err(ProvisioningError::SlugTaken);
        }

        let slug = request.slug.clone();
        let database_url = self.create_database(&slug).await?;
        let registration = TenantRegistration {
            request,
            database_url,
        };
        let setup = self.set_up_tenant(registration).await;

        if setup.is_err() {
            // Otherwise a failed provisioning leaves behind a database no tenant points to.
            self.drop_database(&slug).await;
        }

        setup
    }

    async fn set_up_tenant(
        &self,
        registration: TenantRegistration,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        migrate_database(&registration.database_url).await?;

        self.register_tenant(registration).await
    }

    async fn create_database(&self, slug: &TenantSlug) -> Result<String, ProvisioningError> {
        let database_name = slug.database_name();
        // Identifiers cannot be bound as parameters; TenantSlug only allows [a-z0-9_].
        let statement = format!("CREATE DATABASE \"{database_name}\"");
        self.run_maintenance_statement(statement)
            .await
            .map_err(map_duplicate_database)?;

        Ok(format!("{}/{database_name}", self.base_url()))
    }

    async fn drop_database(&self, slug: &TenantSlug) {
        let database_name = slug.database_name();
        let statement = format!("DROP DATABASE IF EXISTS \"{database_name}\" WITH (FORCE)");

        if let Err(error) = self.run_maintenance_statement(statement).await {
            tracing::error!(%error, %database_name, "failed to drop database of failed tenant");
        }
    }

    /// CREATE/DROP DATABASE cannot run inside a database being created or dropped, so they go
    /// through the server's maintenance database.
    async fn run_maintenance_statement(&self, statement: String) -> Result<(), sqlx::Error> {
        let maintenance_url = format!("{}/{MAINTENANCE_DATABASE}", self.base_url());
        let mut connection = PgConnection::connect(&maintenance_url).await?;
        let execution = sqlx::raw_sql(AssertSqlSafe(statement))
            .execute(&mut connection)
            .await;
        connection.close().await?;
        execution?;

        Ok(())
    }

    fn base_url(&self) -> &str {
        self.tenant_database_base_url.trim_end_matches('/')
    }

    async fn register_tenant(
        &self,
        registration: TenantRegistration,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        let tenant_id = Uuid::new_v4();
        let database_url_ciphertext = self.secret_box.seal(registration.database_url.as_bytes())?;
        let sealed_signing_key = SealedSigningKey::seal(&SigningKey::generate()?, self.secret_box)?;
        let publishable_key = OpaqueToken::generate(ApiKeyKind::Publishable.token_prefix());
        let secret_key = OpaqueToken::generate(ApiKeyKind::Secret.token_prefix());
        let request = registration.request;
        let new_tenant = NewTenant {
            tenant_id,
            slug: &request.slug,
            name: &request.name,
            site_url: &request.site_url,
            require_email_verification: request.require_email_verification,
            database_url_ciphertext: &database_url_ciphertext,
        };
        let publishable_owner = ApiKeyOwner {
            tenant_id,
            kind: ApiKeyKind::Publishable,
        };
        let secret_owner = ApiKeyOwner {
            tenant_id,
            kind: ApiKeyKind::Secret,
        };

        let mut transaction = self.control_plane_pool.begin().await?;
        insert_tenant(&mut transaction, new_tenant).await?;
        insert_active_signing_key(&mut transaction, tenant_id, &sealed_signing_key).await?;
        insert_api_key(&mut transaction, publishable_owner, &publishable_key.hash).await?;
        insert_api_key(&mut transaction, secret_owner, &secret_key.hash).await?;
        transaction.commit().await?;

        Ok(ProvisionedTenant {
            tenant_id,
            slug: request.slug,
            publishable_key: publishable_key.plaintext,
            secret_key: secret_key.plaintext,
        })
    }
}

struct TenantRegistration {
    request: NewTenantRequest,
    database_url: String,
}

async fn migrate_database(database_url: &str) -> Result<(), ProvisioningError> {
    // Through a pool: `Migrator::run` on a bare connection yields a non-Send future.
    let tenant_pool = PgPoolOptions::new()
        .max_connections(MIGRATION_CONNECTIONS)
        .connect(database_url)
        .await?;
    let migration = TENANT_MIGRATOR.run(&tenant_pool).await;
    tenant_pool.close().await;
    migration?;

    Ok(())
}

fn map_duplicate_database(error: sqlx::Error) -> ProvisioningError {
    let database_error = error.as_database_error();
    let error_code = database_error.and_then(|database_error| database_error.code());

    if error_code.is_some_and(|code| code == DUPLICATE_DATABASE_ERROR_CODE) {
        return ProvisioningError::SlugTaken;
    }

    ProvisioningError::Database(error)
}
