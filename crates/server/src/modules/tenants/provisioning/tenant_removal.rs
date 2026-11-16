use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::database::tenant_database_server::TenantDatabaseServer;
use crate::modules::tenants::provisioning::tenant_deletion::{
    TenantDeletionError, delete_tenant_row,
};

/// Removes a tenant for good: its row, its cached pool and keys, and its database.
/// `false` if there is no such tenant.
///
/// The database is dropped while the slug lock is still held: a provisioning of the same slug
/// waiting on that lock can never see its new database dropped by this removal. If the drop
/// fails, the row deletion rolls back and the tenant stays whole.
pub async fn remove_tenant(state: &AppState, tenant_id: Uuid) -> Result<bool, TenantDeletionError> {
    let mut transaction = state.control_plane_pool.begin().await?;
    let Some(slug) = delete_tenant_row(&mut transaction, tenant_id).await? else {
        return Ok(false);
    };
    state.tenant_pools.forget(tenant_id).await;
    state.signing_keys.forget(tenant_id).await;
    let settings = &state.settings;
    TenantDatabaseServer::new(&settings.tenant_database_base_url)
        .try_drop_database(&slug)
        .await?;
    transaction.commit().await?;

    Ok(true)
}
