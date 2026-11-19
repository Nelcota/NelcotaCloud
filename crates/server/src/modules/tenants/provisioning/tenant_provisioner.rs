use std::time::Duration;

use sqlx::{PgConnection, PgPool};
use tokio::sync::Semaphore;
use uuid::Uuid;

use crate::modules::tenants::postgres::tenant_database_server::{
    TenantDatabaseError, TenantDatabaseServer,
};
use crate::modules::tenants::provisioning::provisioning_error::ProvisioningError;
use crate::modules::tenants::provisioning::tenant_registration::register_tenant;
use crate::modules::tenants::provisioning::tenant_repository::{lock_slug, slug_exists};
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::shared::crypto::secret_box::SecretBox;

pub const MAX_CONCURRENT_PROVISIONING: usize = 2;
const PROVISIONING_WAIT: Duration = Duration::from_secs(2);

pub struct TenantProvisioner<'a> {
    pub control_plane_pool: &'a PgPool,
    pub slots: &'a Semaphore,
    pub secret_box: &'a SecretBox,
    pub database_server: TenantDatabaseServer<'a>,
}

pub struct NewTenantRequest {
    pub slug: TenantSlug,
    pub name: String,
    pub site_url: SiteUrl,
    pub require_email_verification: bool,
    /// The platform account that becomes the owner, when created from the console.
    pub owner: Option<ProjectOwner>,
}

/// The console account creating a project, with its email for the team list.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectOwner {
    pub account_id: Uuid,
    pub email: String,
}

/// API keys are returned in plaintext only here; afterwards only their hashes exist.
pub struct ProvisionedTenant {
    pub tenant_id: Uuid,
    pub slug: TenantSlug,
    pub publishable_key: String,
    pub secret_key: String,
}

impl TenantProvisioner<'_> {
    /// Provisions under a per-slug lock held by the registration transaction. A failure (or a
    /// cancelled request) rolls the registration back; the database left behind is an orphan
    /// that is dropped right away when possible and recreated by the next attempt otherwise.
    pub async fn provision(
        &self,
        request: NewTenantRequest,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        let database_server = &self.database_server;
        let slug = request.slug.clone();
        let _slot = tokio::time::timeout(PROVISIONING_WAIT, self.slots.acquire())
            .await
            .map_err(|_| ProvisioningError::Busy)?
            .map_err(|_| ProvisioningError::Busy)?;
        let mut transaction = self.control_plane_pool.begin().await?;
        claim_slug(&mut transaction, &slug).await?;
        let provisioning = self
            .create_and_register(database_server, &mut transaction, request)
            .await;
        let provisioned = match provisioning {
            Ok(provisioned) => provisioned,
            Err(error) => {
                database_server.drop_database(&slug).await;
                return Err(error);
            }
        };

        if let Err(error) = transaction.commit().await {
            self.drop_database_unless_registered(database_server, &slug)
                .await;
            return Err(ProvisioningError::Database(error));
        }

        Ok(provisioned)
    }

    async fn create_and_register(
        &self,
        database_server: &TenantDatabaseServer<'_>,
        transaction: &mut PgConnection,
        request: NewTenantRequest,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        create_fresh_database(database_server, &request.slug).await?;
        database_server.migrate_database(&request.slug).await?;

        register_tenant(transaction, self.secret_box, request).await
    }

    /// A failed COMMIT may still have been applied by the server, so a registered tenant's
    /// database is never dropped. When unsure, it is left: the next attempt recreates it.
    async fn drop_database_unless_registered(
        &self,
        database_server: &TenantDatabaseServer<'_>,
        slug: &TenantSlug,
    ) {
        let cleanup = self.drop_unregistered_database(database_server, slug).await;

        if let Err(error) = cleanup {
            tracing::warn!(
                slug = slug.as_str(),
                %error,
                "left a possibly orphan tenant database for the next attempt"
            );
        }
    }

    /// Checks and drops under the slug lock, so a concurrent provisioning of the same slug that
    /// already created its database (or registered it) never loses it to this cleanup.
    async fn drop_unregistered_database(
        &self,
        database_server: &TenantDatabaseServer<'_>,
        slug: &TenantSlug,
    ) -> Result<(), sqlx::Error> {
        let mut transaction = self.control_plane_pool.begin().await?;
        lock_slug(&mut transaction, slug).await?;

        if slug_exists(&mut *transaction, slug).await? {
            return Ok(());
        }

        database_server.drop_database(slug).await;

        transaction.commit().await
    }
}

/// Called under the slug lock with no tenant row for the slug, so an existing database is an
/// orphan of an earlier failed or cancelled attempt: it is replaced, never reused.
async fn create_fresh_database(
    database_server: &TenantDatabaseServer<'_>,
    slug: &TenantSlug,
) -> Result<(), ProvisioningError> {
    let creation = database_server.create_database(slug).await;

    if matches!(creation, Err(TenantDatabaseError::AlreadyExists)) == false {
        return creation.map_err(Into::into);
    }

    tracing::warn!(slug = slug.as_str(), "replacing orphan tenant database");
    database_server.drop_database(slug).await;
    database_server.create_database(slug).await?;

    Ok(())
}

/// Holds the slug lock until the transaction ends, refusing a slug already in use.
async fn claim_slug(
    transaction: &mut PgConnection,
    slug: &TenantSlug,
) -> Result<(), ProvisioningError> {
    lock_slug(transaction, slug).await?;

    if slug_exists(&mut *transaction, slug).await? {
        return Err(ProvisioningError::SlugTaken);
    }

    Ok(())
}
