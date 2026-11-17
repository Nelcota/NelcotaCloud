use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::team::member::ownership_changes::{
    MembershipTarget, ensure_another_owner, ensure_below_owner_limit, lock_membership, set_role,
};
use crate::modules::team::member::ownership_error::OwnershipError;
use crate::modules::tenants::platform::project_role::ProjectRole;

/// An owner acting on another membership of the same project.
#[derive(Debug, Clone, Copy)]
pub struct OwnerAction {
    pub actor_account_id: Uuid,
    pub target: MembershipTarget,
}

impl OwnerAction {
    fn actor(&self) -> MembershipTarget {
        MembershipTarget {
            tenant_id: self.target.tenant_id,
            account_id: self.actor_account_id,
        }
    }
}

/// Gives a member another role. Demoting keeps at least one owner; promoting respects the
/// limit of projects an account may own.
pub async fn change_member_role(
    pool: &PgPool,
    action: OwnerAction,
    role: ProjectRole,
) -> Result<(), OwnershipError> {
    let target = action.target;
    let mut transaction = pool.begin().await?;
    let current = lock_as_owner(&mut transaction, action).await?;

    if current == role {
        return Ok(());
    }

    if role == ProjectRole::Member {
        ensure_another_owner(&mut transaction, target).await?;
    }

    if role == ProjectRole::Owner {
        ensure_below_owner_limit(&mut transaction, target.account_id).await?;
    }

    set_role(&mut transaction, target, role).await?;
    transaction.commit().await?;

    Ok(())
}

/// Takes a member's access away; owners are never removed this way.
pub async fn remove_member(pool: &PgPool, action: OwnerAction) -> Result<(), OwnershipError> {
    let target = action.target;
    let mut transaction = pool.begin().await?;

    if lock_as_owner(&mut transaction, action).await? != ProjectRole::Member {
        return Err(OwnershipError::NotMember);
    }

    sqlx::query("DELETE FROM tenant_members WHERE tenant_id = $1 AND account_id = $2")
        .bind(target.tenant_id)
        .bind(target.account_id)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;

    Ok(())
}

/// Locks the project's memberships, then checks the actor is still an owner: a demotion or
/// removal committed meanwhile is seen here, never acted on by a former owner. Returns the
/// target's role.
async fn lock_as_owner(
    connection: &mut PgConnection,
    action: OwnerAction,
) -> Result<ProjectRole, OwnershipError> {
    match lock_membership(connection, action.actor()).await {
        Ok(ProjectRole::Owner) => {}
        Ok(ProjectRole::Member) | Err(OwnershipError::NotMember) => {
            return Err(OwnershipError::NotOwner);
        }
        Err(error) => return Err(error),
    }

    lock_membership(connection, action.target).await
}
