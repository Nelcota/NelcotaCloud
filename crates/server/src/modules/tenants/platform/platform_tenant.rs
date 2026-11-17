use std::time::Duration;

use moka::future::Cache;
use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::provisioning::tenant_repository::find_tenant_id_by_slug;
use crate::modules::tenants::provisioning::tenant_slug::TenantSlug;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

/// Every console request needs the platform tenant's id; a minute is short enough to follow an
/// operator recreating it.
const PLATFORM_TENANT_TIME_TO_LIVE: Duration = Duration::from_secs(60);

#[derive(Debug, thiserror::Error)]
enum PlatformTenantLookupError {
    #[error("the platform tenant does not exist yet")]
    Missing,
    #[error("database error while looking up the platform tenant: {0}")]
    Database(#[from] sqlx::Error),
}

/// Finds the tenant named by `PLATFORM_TENANT_SLUG` and remembers its id.
pub struct PlatformTenantDirectory {
    control_plane_pool: PgPool,
    /// `None` disables the platform API.
    slug: Option<TenantSlug>,
    ids: Cache<(), Uuid>,
}

impl PlatformTenantDirectory {
    pub fn new(control_plane_pool: PgPool, slug: Option<TenantSlug>) -> Self {
        let ids = Cache::builder()
            .max_capacity(1)
            .time_to_live(PLATFORM_TENANT_TIME_TO_LIVE)
            .build();

        Self {
            control_plane_pool,
            slug,
            ids,
        }
    }

    /// The tenant whose users are platform accounts. Until the operator creates it the platform
    /// API answers 503; a missing tenant is not cached, so it works as soon as it exists.
    pub async fn find_id(&self) -> Result<Uuid, ApiError> {
        let Some(slug) = &self.slug else {
            return Err(ApiError::from(TenantsRejection::PlatformNotConfigured));
        };
        let lookup = async {
            let tenant_id = find_tenant_id_by_slug(&self.control_plane_pool, slug).await?;
            let Some(tenant_id) = tenant_id else {
                return Err(PlatformTenantLookupError::Missing);
            };

            Ok(tenant_id)
        };
        let found = self.ids.try_get_with((), lookup).await;

        found.map_err(|error| match *error {
            PlatformTenantLookupError::Missing => {
                ApiError::from(TenantsRejection::PlatformNotConfigured)
            }
            PlatformTenantLookupError::Database(_) => ApiError::internal(error),
        })
    }
}
