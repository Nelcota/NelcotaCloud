use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::team::member::ownership_error::OwnershipError;
use crate::modules::tenants::platform::membership_repository::count_owned_projects;
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::modules::tenants::provisioning::tenant_registration::MAX_OWNED_PROJECTS;

/// One membership of a project, to change or end.
#[derive(Debug, Clone, Copy)]
pub struct MembershipTarget {
    pub tenant_id: Uuid,
    pub account_id: Uuid,
}

/// Gives a member another role. Demoting keeps at least one owner; promoting respects the
/// limit of projects an account may own.
pub async fn change_member_role(
    pool: &PgPool,
    target: MembershipTarget,
    role: ProjectRole,
) -> Result<(), OwnershipError> {
    let mut transaction = pool.begin().await?;
    let current = lock_membership(&mut transaction, target).await?;

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

/// The account leaves the project; an owner only while another owner stays.
pub async fn leave_project(pool: &PgPool, target: MembershipTarget) -> Result<(), OwnershipError> {
    let mut transaction = pool.begin().await?;
    let current = lock_membership(&mut transaction, target).await?;

    if current == ProjectRole::Owner {
        ensure_another_owner(&mut transaction, target).await?;
    }

    sqlx::query("DELETE FROM tenant_members WHERE tenant_id = $1 AND account_id = $2")
        .bind(target.tenant_id)
        .bind(target.account_id)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;

    Ok(())
}

/// Locks every membership of the project before reading the target's role, so two owners
/// demoting each other (or leaving) at once cannot leave the project without an owner.
pub(super) async fn lock_membership(
    connection: &mut PgConnection,
    target: MembershipTarget,
) -> Result<ProjectRole, OwnershipError> {
    let roles: Vec<(Uuid, String)> = sqlx::query_as(
        "SELECT account_id, role FROM tenant_members WHERE tenant_id = $1 ORDER BY account_id FOR UPDATE",
    )
    .bind(target.tenant_id)
    .fetch_all(connection)
    .await?;
    let Some((_, raw_role)) = roles
        .iter()
        .find(|(account_id, _)| *account_id == target.account_id)
    else {
        return Err(OwnershipError::NotMember);
    };
    let Some(role) = ProjectRole::parse(raw_role) else {
        return Err(OwnershipError::UnknownRole);
    };

    Ok(role)
}

async fn ensure_another_owner(
    connection: &mut PgConnection,
    target: MembershipTarget,
) -> Result<(), OwnershipError> {
    let other_owners: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM tenant_members WHERE tenant_id = $1 AND role = 'owner' AND account_id <> $2",
    )
    .bind(target.tenant_id)
    .bind(target.account_id)
    .fetch_one(connection)
    .await?;

    if other_owners == 0 {
        return Err(OwnershipError::LastOwner);
    }

    Ok(())
}

pub(super) async fn ensure_below_owner_limit(
    connection: &mut PgConnection,
    account_id: Uuid,
) -> Result<(), OwnershipError> {
    if count_owned_projects(connection, account_id).await? >= MAX_OWNED_PROJECTS {
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
