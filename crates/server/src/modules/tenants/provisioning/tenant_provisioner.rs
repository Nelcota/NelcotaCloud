use std::time::Duration;

use sqlx::{PgConnection, PgPool};
use tokio::sync::Semaphore;
use uuid::Uuid;

use crate::modules::tenants::postgres::tenant_database_server::{
    TenantDatabaseError, TenantDatabaseServer,
};
use crate::modules::tenants::provisioning::provisioning_error::ProvisioningError;
use crate::modules::tenants::provisioning::provisioning_intent::ProvisioningIntent;
use crate::modules::tenants::provisioning::tenant_registration::register_tenant;
use crate::modules::tenants::provisioning::tenant_repository::{
    lock_slug, slug_exists, try_lock_slug,
};
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
    /// Reserve the slug durably before creating anything that can outlive the request.
    pub async fn provision(
        &self,
        request: NewTenantRequest,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        let slug = request.slug.clone();
        let _slot = tokio::time::timeout(PROVISIONING_WAIT, self.slots.acquire())
            .await
            .map_err(|_| ProvisioningError::Busy)?
            .map_err(|_| ProvisioningError::Busy)?;
        let intent = ProvisioningIntent::reserve(self.control_plane_pool, &slug).await?;
        let mut transaction = self.control_plane_pool.begin().await?;
        lock_slug(&mut transaction, &slug).await?;

        if intent.exists(&mut transaction).await? == false {
            return Err(ProvisioningError::Busy);
        }

        if slug_exists(&mut *transaction, &slug).await? {
            intent.complete(&mut transaction).await?;
            transaction.commit().await?;

            return Err(ProvisioningError::SlugTaken);
        }

        let provisioning = self
            .create_and_register(&mut transaction, intent.tenant_id, request)
            .await;
        let provisioned = match provisioning {
            Ok(provisioned) => provisioned,
            Err(error) => {
                drop(transaction);
                self.recover(&intent).await;
                return Err(error);
            }
        };
        intent.complete(&mut transaction).await?;
        transaction.commit().await?;

        Ok(provisioned)
    }

    async fn create_and_register(
        &self,
        transaction: &mut PgConnection,
        tenant_id: Uuid,
        request: NewTenantRequest,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        let server = &self.database_server;
        create_fresh_database(server, &request.slug).await?;
        server.migrate_database(&request.slug, tenant_id).await?;

        register_tenant(transaction, self.secret_box, (tenant_id, request)).await
    }

    pub async fn recover_pending(&self) -> Result<(), sqlx::Error> {
        for intent in ProvisioningIntent::due(self.control_plane_pool).await? {
            self.recover(&intent).await;
        }

        Ok(())
    }

    async fn recover(&self, intent: &ProvisioningIntent) {
        if let Err(error) = self.drop_unregistered_database(intent).await {
            tracing::warn!(slug = %intent.slug, %error, "could not recover tenant provisioning");

            if let Err(error) = intent.postpone(self.control_plane_pool).await {
                tracing::warn!(%error, "could not postpone tenant provisioning recovery");
            }
        }
    }

    async fn drop_unregistered_database(
        &self,
        intent: &ProvisioningIntent,
    ) -> Result<(), ProvisioningError> {
        let slug = TenantSlug::parse(&intent.slug).map_err(TenantDatabaseError::InvalidSlug)?;
        let mut transaction = self.control_plane_pool.begin().await?;

        if try_lock_slug(&mut transaction, &slug).await? == false
            || intent.exists(&mut transaction).await? == false
        {
            return Ok(());
        }

        if slug_exists(&mut *transaction, &slug).await? == false {
            self.database_server.try_drop_database(&slug).await?;
        }

        intent.complete(&mut transaction).await?;
        transaction.commit().await?;

        Ok(())
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
