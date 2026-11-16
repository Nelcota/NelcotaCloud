use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::database::tenant_database_server::TenantDatabaseServer;
use crate::modules::tenants::provisioning::tenant_deletion::{
    TenantDeletionError, delete_tenant_row,
};

/// Removes a tenant for good: its row, its cached pool and keys, then its database.
/// `false` if there is no such tenant.
pub async fn remove_tenant(state: &AppState, tenant_id: Uuid) -> Result<bool, TenantDeletionError> {
    let Some(slug) = delete_tenant_row(&state.control_plane_pool, tenant_id).await? else {
        return Ok(false);
    };
    state.tenant_pools.forget(tenant_id).await;
    state.signing_keys.forget(tenant_id).await;
    let settings = &state.settings;
    TenantDatabaseServer::new(&settings.tenant_database_base_url)
        .drop_database(&slug)
        .await;

    Ok(true)
}
