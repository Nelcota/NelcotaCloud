use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::team::member::ownership_changes::{
    MembershipTarget, delete_membership, ensure_below_owner_limit, require_another_owner,
    require_member_role, set_role,
};
use crate::modules::team::member::ownership_error::OwnershipError;
use crate::modules::team::member::team_access::TeamAccounts;
use crate::modules::tenants::platform::membership_repository::{
    LockedProjectMemberships, lock_project_memberships,
};
use crate::modules::tenants::platform::project_role::ProjectRole;

/// An owner acting on another membership of the same project.
#[derive(Debug, Clone, Copy)]
pub struct OwnerAction {
    pub actor_account_id: Uuid,
    pub target: MembershipTarget,
}

/// Gives a member another role. Demoting an owner keeps at least one owner; promoting
/// respects the limit of projects an account may own.
pub async fn change_member_role(
    pool: &PgPool,
    accounts: &mut TeamAccounts,
    action: OwnerAction,
    role: ProjectRole,
) -> Result<bool, OwnershipError> {
    let target = action.target;
    let mut transaction = pool.begin().await?;
    let memberships = lock_project_memberships(&mut transaction, target.tenant_id).await?;
    let current = role_for_owner_action(&memberships, action)?;

    if current == role {
        return Ok(false);
    }

    if current == ProjectRole::Owner {
        require_another_owner(accounts, &memberships, target.account_id).await?;
    }

    if role == ProjectRole::Owner {
        if accounts.has_active(&[target.account_id]).await? == false {
            return Err(OwnershipError::NotMember);
        }

        ensure_below_owner_limit(&mut transaction, target.account_id).await?;
    }

    set_role(&mut transaction, target, role).await?;
    transaction.commit().await?;

    Ok(true)
}

/// Takes a member's access away; owners are never removed this way.
pub async fn remove_member(pool: &PgPool, action: OwnerAction) -> Result<(), OwnershipError> {
    let target = action.target;
    let mut transaction = pool.begin().await?;
    let memberships = lock_project_memberships(&mut transaction, target.tenant_id).await?;

    if role_for_owner_action(&memberships, action)? == ProjectRole::Owner {
        return Err(OwnershipError::NotMember);
    }

    delete_membership(&mut transaction, target).await?;
    transaction.commit().await?;

    Ok(())
}

/// Reads both roles from the locked snapshot so a former owner cannot change a membership.
fn role_for_owner_action(
    memberships: &LockedProjectMemberships,
    action: OwnerAction,
) -> Result<ProjectRole, OwnershipError> {
    match require_member_role(memberships, action.actor_account_id) {
        Ok(ProjectRole::Owner) => {}
        Ok(ProjectRole::Member | ProjectRole::Viewer) | Err(OwnershipError::NotMember) => {
            return Err(OwnershipError::NotOwner);
        }
        Err(error) => return Err(error),
    }

    require_member_role(memberships, action.target.account_id)
}
