use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::provisioning::tenant_repository::find_tenant_id_by_slug;
use crate::shared::http::api_error::ApiError;

/// The tenant whose users are platform accounts, from `PLATFORM_TENANT_SLUG`. Looked up on
/// each use, so it works as soon as the operator creates it, with no restart.
pub async fn find_platform_tenant_id(state: &AppState) -> Result<Uuid, ApiError> {
    let Some(slug) = &state.settings.platform_tenant_slug else {
        return Err(ApiError::PlatformNotConfigured);
    };
    let tenant_id = find_tenant_id_by_slug(&state.control_plane_pool, slug)
        .await
        .map_err(ApiError::internal)?;
    let Some(tenant_id) = tenant_id else {
        return Err(ApiError::PlatformNotConfigured);
    };

    Ok(tenant_id)
}
