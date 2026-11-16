use std::time::Duration;

use moka::future::Cache;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::provisioning::tenant_repository::find_tenant_id_by_slug;
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

/// Remembers the id of the tenant named by `PLATFORM_TENANT_SLUG`.
pub struct PlatformTenantDirectory {
    ids: Cache<(), Uuid>,
}

impl PlatformTenantDirectory {
    pub fn new() -> Self {
        let ids = Cache::builder()
            .max_capacity(1)
            .time_to_live(PLATFORM_TENANT_TIME_TO_LIVE)
            .build();

        Self { ids }
    }
}

impl Default for PlatformTenantDirectory {
    fn default() -> Self {
        Self::new()
    }
}

/// The tenant whose users are platform accounts. Until the operator creates it the platform API
/// answers 503; a missing tenant is not cached, so it works as soon as it exists.
pub async fn find_platform_tenant_id(state: &AppState) -> Result<Uuid, ApiError> {
    let Some(slug) = &state.settings.platform_tenant_slug else {
        return Err(ApiError::PlatformNotConfigured);
    };
    let lookup = async {
        let tenant_id = find_tenant_id_by_slug(&state.control_plane_pool, slug).await?;
        let Some(tenant_id) = tenant_id else {
            return Err(PlatformTenantLookupError::Missing);
        };

        Ok(tenant_id)
    };
    let found = state.platform_tenant.ids.try_get_with((), lookup).await;

    found.map_err(|error| match *error {
        PlatformTenantLookupError::Missing => ApiError::PlatformNotConfigured,
        PlatformTenantLookupError::Database(_) => ApiError::internal(error),
    })
}
