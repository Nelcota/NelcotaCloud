use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::platform::membership_repository::{
    MembershipError, lock_project_memberships,
};
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::tenants::provisioning::tenant_deletion::{
    TenantDeletionError, complete_deletion, is_pending, pending_slug, requested_by, stage_deletion,
};
use crate::modules::tenants::provisioning::tenant_repository::lock_slug;
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

/// Retires access before destroying data. The committed deletion intent reserves the slug
/// until cleanup finishes and makes the cleanup safe to retry after an interruption.
pub struct TenantRemoval<'a> {
    pub control_plane_pool: &'a PgPool,
    pub tenant_pools: &'a TenantPoolRegistry,
    pub signing_keys: &'a SigningKeyCache,
}

impl TenantRemoval<'_> {
    /// `false` if there is no such tenant.
    pub async fn remove_tenant(&self, tenant_id: Uuid) -> Result<bool, TenantDeletionError> {
        let mut transaction = self.control_plane_pool.begin().await?;
        lock_project_memberships(&mut transaction, tenant_id).await?;
        let staged = stage_deletion(&mut transaction, tenant_id, None).await?;
        let pending = is_pending(&mut *transaction, tenant_id).await?;
        transaction.commit().await?;

        if staged == false && pending == false {
            return Ok(false);
        }

        self.finish_pending(tenant_id).await?;
        Ok(true)
    }

    /// A transfer and a deletion serialize on the same membership rows.
    pub async fn remove_owned_project(
        &self,
        project_id: Uuid,
        account_id: Uuid,
    ) -> Result<(), ProjectRemovalError> {
        let begin = self.control_plane_pool.begin().await;
        let mut transaction = begin.map_err(TenantDeletionError::from)?;
        let memberships = lock_project_memberships(&mut transaction, project_id).await?;
        let role = memberships.role_of(account_id)?;

        if role == Some(ProjectRole::Owner) {
            stage_deletion(&mut transaction, project_id, Some(account_id)).await?;
        }

        let can_finish = requested_by(&mut transaction, project_id, account_id)
            .await
            .map_err(TenantDeletionError::from)?;

        if can_finish == false {
            return Err(ProjectRemovalError::NotOwner);
        }

        let commit = transaction.commit().await;
        commit.map_err(TenantDeletionError::from)?;
        self.finish_pending(project_id).await?;

        Ok(())
    }

    pub async fn finish_pending(&self, tenant_id: Uuid) -> Result<(), TenantDeletionError> {
        let slug = pending_slug(self.control_plane_pool, tenant_id).await?;
        let slug = match slug {
            Some(slug) => slug,
            None => return Ok(()),
        };
        let mut transaction = self.control_plane_pool.begin().await?;
        lock_slug(&mut transaction, &slug).await?;

        // Once the slug can be reused, a stale worker must not run the old deletion.
        if is_pending(&mut *transaction, tenant_id).await? == false {
            return Ok(());
        }

        self.forget_cached(tenant_id).await;
        let database_server = self.tenant_pools.database_server();
        database_server.try_drop_database(&slug).await?;
        complete_deletion(&mut transaction, tenant_id).await?;
        transaction.commit().await?;

        Ok(())
    }

    async fn forget_cached(&self, tenant_id: Uuid) {
        self.signing_keys.forget(tenant_id);
        self.tenant_pools.forget(tenant_id).await;
    }
}
