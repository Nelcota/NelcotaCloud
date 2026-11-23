use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::team::member::ownership_error::OwnershipError;
use crate::modules::team::member::team_access::TeamAccounts;
use crate::modules::tenants::platform::membership_repository::{
    LockedProjectMemberships, MAX_OWNED_PROJECTS, can_own_another_project, lock_project_memberships,
};
use crate::modules::tenants::platform::project_role::ProjectRole;

/// One membership of a project, to change or end.
#[derive(Debug, Clone, Copy)]
pub struct MembershipTarget {
    pub tenant_id: Uuid,
    pub account_id: Uuid,
}

/// The account leaves the project; an owner only while another owner stays.
pub async fn leave_project(
    pool: &PgPool,
    accounts: &mut TeamAccounts,
    target: MembershipTarget,
) -> Result<(), OwnershipError> {
    let mut transaction = pool.begin().await?;
    let memberships = lock_project_memberships(&mut transaction, target.tenant_id).await?;
    let current = require_member_role(&memberships, target.account_id)?;

    if current == ProjectRole::Owner {
        require_another_owner(accounts, &memberships, target.account_id).await?;
    }

    delete_membership(&mut transaction, target).await?;
    transaction.commit().await?;

    Ok(())
}

pub(super) fn require_member_role(
    memberships: &LockedProjectMemberships,
    account_id: Uuid,
) -> Result<ProjectRole, OwnershipError> {
    memberships
        .role_of(account_id)?
        .ok_or(OwnershipError::NotMember)
}

pub(super) async fn require_another_owner(
    accounts: &mut TeamAccounts,
    memberships: &LockedProjectMemberships,
    account_id: Uuid,
) -> Result<(), OwnershipError> {
    if accounts
        .has_active(&memberships.other_owners(account_id))
        .await?
        == false
    {
        return Err(OwnershipError::LastOwner);
    }

    Ok(())
}

pub(super) async fn delete_membership(
    connection: &mut PgConnection,
    target: MembershipTarget,
) -> Result<(), OwnershipError> {
    sqlx::query(
        "DELETE FROM tenant_invitations AS invitation USING tenant_members AS member
         WHERE member.tenant_id = $1 AND member.account_id = $2
             AND invitation.tenant_id = member.tenant_id AND invitation.email = member.account_email",
    )
    .bind(target.tenant_id)
    .bind(target.account_id)
    .execute(&mut *connection)
    .await?;
    sqlx::query("DELETE FROM tenant_members WHERE tenant_id = $1 AND account_id = $2")
        .bind(target.tenant_id)
        .bind(target.account_id)
        .execute(connection)
        .await?;

    Ok(())
}

pub(super) async fn ensure_below_owner_limit(
    connection: &mut PgConnection,
    account_id: Uuid,
) -> Result<(), OwnershipError> {
    if can_own_another_project(connection, account_id).await? == false {
        return Err(OwnershipError::OwnedProjectLimit(MAX_OWNED_PROJECTS));
    }

    Ok(())
}

pub(super) async fn set_role(
    connection: &mut PgConnection,
    target: MembershipTarget,
    role: ProjectRole,
) -> Result<(), OwnershipError> {
    sqlx::query("UPDATE tenant_members SET role = $3 WHERE tenant_id = $1 AND account_id = $2")
        .bind(target.tenant_id)
        .bind(target.account_id)
        .bind(role.as_str())
        .execute(connection)
        .await?;

    Ok(())
}
