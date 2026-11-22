use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::provisioning::tenant_repository::find_tenant_id_by_slug;
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

/// Finds the active tenant named by `PLATFORM_TENANT_SLUG`.
pub struct PlatformTenantDirectory {
    control_plane_pool: PgPool,
    /// `None` disables the platform API.
    slug: Option<TenantSlug>,
}

impl PlatformTenantDirectory {
    pub fn new(control_plane_pool: PgPool, slug: Option<TenantSlug>) -> Self {
        Self {
            control_plane_pool,
            slug,
        }
    }

    /// The tenant whose users are platform accounts. Until the operator creates it the platform
    /// API answers 503.
    pub async fn find_id(&self) -> Result<Uuid, ApiError> {
        let tenant_id = self.find_optional_id().await?;
        Ok(tenant_id.ok_or(TenantsRejection::PlatformNotConfigured)?)
    }

    pub async fn find_optional_id(&self) -> Result<Option<Uuid>, sqlx::Error> {
        let Some(slug) = &self.slug else {
            return Ok(None);
        };

        find_tenant_id_by_slug(&self.control_plane_pool, slug).await
    }
}
