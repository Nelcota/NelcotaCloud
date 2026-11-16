use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::database::tenant_database_server::TenantDatabaseServer;
use crate::modules::tenants::provisioning::provisioning_error::ProvisioningError;
use crate::modules::tenants::provisioning::tenant_registration::{
    TenantRegistration, register_tenant,
};
use crate::modules::tenants::provisioning::tenant_repository::slug_exists;
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::settings::site_url::SiteUrl;
use crate::shared::crypto::secret_box::SecretBox;

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
    /// Creates and migrates the tenant's database, then registers the tenant. Any failure after
    /// the database exists drops it, so no database is left without a tenant.
    pub async fn provision(
        &self,
        request: NewTenantRequest,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        if slug_exists(self.control_plane_pool, &request.slug).await? {
            return Err(ProvisioningError::SlugTaken);
        }

        let database_server = TenantDatabaseServer::new(self.tenant_database_base_url);
        let slug = request.slug.clone();
        let database_url = database_server.create_database(&slug).await?;
        let registration = TenantRegistration {
            request,
            database_url,
        };
        let setup = self.set_up_tenant(&database_server, registration).await;

        if setup.is_err() {
            database_server.drop_database(&slug).await;
        }

        setup
    }

    async fn set_up_tenant(
        &self,
        database_server: &TenantDatabaseServer<'_>,
        registration: TenantRegistration,
    ) -> Result<ProvisionedTenant, ProvisioningError> {
        database_server
            .migrate_database(&registration.database_url)
            .await?;

        register_tenant(self.control_plane_pool, self.secret_box, registration).await
    }
}
