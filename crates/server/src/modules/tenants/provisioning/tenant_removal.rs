use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::database::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::tenants::platform::membership_repository::{
    MembershipError, lock_project_role,
};
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::modules::tenants::provisioning::tenant_deletion::{
    TenantDeletionError, delete_tenant_row,
};
use crate::modules::tenants::signing_keys::signing_key_cache::SigningKeyCache;

#[derive(Debug, thiserror::Error)]
pub enum ProjectRemovalError {
    #[error("only owners delete a project")]
    NotOwner,
    #[error(transparent)]
    Membership(#[from] MembershipError),
    #[error(transparent)]
    Deletion(#[from] TenantDeletionError),
}

/// Removes tenants for good: their row, their cached pool and keys, and their database.
///
/// The database is dropped while the slug lock is still held: a provisioning of the same slug
/// waiting on that lock can never see its new database dropped by this removal. If the drop
/// fails, the row deletion rolls back and the tenant stays whole.
pub struct TenantRemoval<'a> {
    pub control_plane_pool: &'a PgPool,
    pub tenant_pools: &'a TenantPoolRegistry,
    pub signing_keys: &'a SigningKeyCache,
}

impl TenantRemoval<'_> {
    /// `false` if there is no such tenant.
    pub async fn remove_tenant(&self, tenant_id: Uuid) -> Result<bool, TenantDeletionError> {
        let mut transaction = self.control_plane_pool.begin().await?;
        let is_removed = self.remove_within(&mut transaction, tenant_id).await?;
        transaction.commit().await?;

        Ok(is_removed)
    }

    /// Checks ownership in the same transaction as the removal, holding the membership, so an
    /// ownership transfer cannot complete between the check and the deletion.
    pub async fn remove_owned_project(
        &self,
        project_id: Uuid,
        account_id: Uuid,
    ) -> Result<(), ProjectRemovalError> {
        let begin = self.control_plane_pool.begin().await;
        let mut transaction = begin.map_err(TenantDeletionError::from)?;
        let role = lock_project_role(&mut transaction, project_id, account_id).await?;

        if role != Some(ProjectRole::Owner) {
            return Err(ProjectRemovalError::NotOwner);
        }

        self.remove_within(&mut transaction, project_id).await?;
        let commit = transaction.commit().await;
        commit.map_err(TenantDeletionError::from)?;

        Ok(())
    }

    async fn remove_within(
        &self,
        transaction: &mut PgConnection,
        tenant_id: Uuid,
    ) -> Result<bool, TenantDeletionError> {
        let Some(slug) = delete_tenant_row(transaction, tenant_id).await? else {
            return Ok(false);
        };
        self.tenant_pools.forget(tenant_id).await;
        self.signing_keys.forget(tenant_id).await;
        let database_server = self.tenant_pools.database_server();
        database_server.try_drop_database(&slug).await?;

        Ok(true)
    }
}
