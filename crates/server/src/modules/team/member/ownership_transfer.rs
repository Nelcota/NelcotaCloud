use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::team::member::ownership_changes::{
    MembershipTarget, ensure_below_owner_limit, require_member_role, set_role,
};
use crate::modules::team::member::ownership_error::OwnershipError;
use crate::modules::team::member::team_access::TeamAccounts;
use crate::modules::tenants::platform::membership_repository::lock_project_memberships;
use crate::modules::tenants::platform::project_role::ProjectRole;

/// Who hands the project over, and to whom.
#[derive(Debug, Clone, Copy)]
pub struct OwnershipTransfer {
    pub tenant_id: Uuid,
    pub from_account_id: Uuid,
    pub to_account_id: Uuid,
}

impl OwnershipTransfer {
    /// The current owner's membership and the new owner's.
    fn targets(&self) -> (MembershipTarget, MembershipTarget) {
        let membership = |account_id| MembershipTarget {
            tenant_id: self.tenant_id,
            account_id,
        };

        (
            membership(self.from_account_id),
            membership(self.to_account_id),
        )
    }
}

/// Makes another member an owner and the current owner a member, in one transaction: the
/// project is never ownerless, and never ends up with the handover half done.
pub async fn transfer_ownership(
    pool: &PgPool,
    accounts: &mut TeamAccounts,
    transfer: OwnershipTransfer,
) -> Result<(), OwnershipError> {
    if transfer.from_account_id == transfer.to_account_id {
        return Err(OwnershipError::SameAccount);
    }

    let (from, to) = transfer.targets();
    let mut transaction = pool.begin().await?;
    let memberships = lock_project_memberships(&mut transaction, transfer.tenant_id).await?;

    if require_member_role(&memberships, from.account_id)? != ProjectRole::Owner {
        return Err(OwnershipError::NotOwner);
    }

    let destination_role = require_member_role(&memberships, to.account_id)?;

    if accounts.has_active(&[to.account_id]).await? == false {
        return Err(OwnershipError::NotMember);
    }

    if destination_role == ProjectRole::Member {
        ensure_below_owner_limit(&mut transaction, to.account_id).await?;
        set_role(&mut transaction, to, ProjectRole::Owner).await?;
    }

    set_role(&mut transaction, from, ProjectRole::Member).await?;
    transaction.commit().await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn both_memberships_belong_to_the_transferred_project() {
        let transfer = OwnershipTransfer {
            tenant_id: Uuid::new_v4(),
            from_account_id: Uuid::new_v4(),
            to_account_id: Uuid::new_v4(),
        };
        let (from, to) = transfer.targets();

        assert_eq!(
            (from.tenant_id, from.account_id),
            (transfer.tenant_id, transfer.from_account_id)
        );
        assert_eq!(
            (to.tenant_id, to.account_id),
            (transfer.tenant_id, transfer.to_account_id)
        );
    }
}
