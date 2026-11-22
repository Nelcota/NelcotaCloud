use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::platform::project_role::ProjectRole;

/// Each project is a database, so ownership is capped per account.
pub const MAX_OWNED_PROJECTS: i64 = 10;

#[derive(Debug, thiserror::Error)]
pub enum MembershipError {
    #[error("database error while reading memberships: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored membership has an unknown role")]
    UnknownRole,
}

/// A membership to create, with the account's current email for team lists.
pub struct NewMembership<'a> {
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub account_email: &'a str,
    pub role: ProjectRole,
}

pub async fn insert_membership(
    connection: &mut PgConnection,
    membership: NewMembership<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tenant_members (tenant_id, account_id, account_email, role) VALUES ($1, $2, $3, $4)",
    )
    .bind(membership.tenant_id)
    .bind(membership.account_id)
    .bind(membership.account_email)
    .bind(membership.role.as_str())
    .execute(connection)
    .await?;

    Ok(())
}

/// Records the account's current email on its memberships, so team lists can show it; a
/// no-op when nothing changed.
pub async fn refresh_member_email(
    pool: &PgPool,
    account_id: Uuid,
    email: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE tenant_members SET account_email = $2 WHERE account_id = $1 AND account_email <> $2",
    )
    .bind(account_id)
    .bind(email)
    .execute(pool)
    .await?;

    Ok(())
}

/// The account's role in the project, or `None` when it is not a member.
pub async fn find_project_role(
    pool: &PgPool,
    tenant_id: Uuid,
    account_id: Uuid,
) -> Result<Option<ProjectRole>, MembershipError> {
    let raw_role: Option<String> = sqlx::query_scalar(
        "SELECT role FROM tenant_members WHERE tenant_id = $1 AND account_id = $2",
    )
    .bind(tenant_id)
    .bind(account_id)
    .fetch_optional(pool)
    .await?;

    parse_role(raw_role.as_deref())
}

/// The roles read under the project's membership locks.
pub struct LockedProjectMemberships(Vec<(Uuid, String)>);

impl LockedProjectMemberships {
    pub fn role_of(&self, account_id: Uuid) -> Result<Option<ProjectRole>, MembershipError> {
        let role = self.0.iter().find(|(id, _)| *id == account_id);
        parse_role(role.map(|(_, role)| role.as_str()))
    }

    pub fn other_owners(&self, account_id: Uuid) -> Vec<Uuid> {
        self.0
            .iter()
            .filter(|(id, role)| *id != account_id && role == ProjectRole::Owner.as_str())
            .map(|(id, _)| *id)
            .collect()
    }
}

/// Role changes, ownership transfers and project deletion take these locks in account order.
pub async fn lock_project_memberships(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<LockedProjectMemberships, MembershipError> {
    lock_team_project(connection, tenant_id).await?;
    let roles = sqlx::query_as(
        "SELECT account_id, role FROM tenant_members WHERE tenant_id = $1 ORDER BY account_id FOR UPDATE",
    )
    .bind(tenant_id)
    .fetch_all(connection)
    .await?;

    Ok(LockedProjectMemberships(roles))
}

/// Acquire before touching any membership or invitation in the project.
pub async fn lock_team_project(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended('team-project:' || $1::text, 0))")
        .bind(tenant_id)
        .execute(connection)
        .await?;

    Ok(())
}

fn parse_role(raw_role: Option<&str>) -> Result<Option<ProjectRole>, MembershipError> {
    let raw_role = match raw_role {
        Some(raw_role) => raw_role,
        None => return Ok(None),
    };
    let role = ProjectRole::parse(raw_role).ok_or(MembershipError::UnknownRole)?;

    Ok(Some(role))
}

/// Provisioning and promotions share the account lock so concurrent changes respect the cap.
pub async fn can_own_another_project(
    connection: &mut PgConnection,
    account_id: Uuid,
) -> Result<bool, sqlx::Error> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))")
        .bind(account_id)
        .execute(&mut *connection)
        .await?;

    let total: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM tenant_members WHERE account_id = $1 AND role = 'owner'",
    )
    .bind(account_id)
    .fetch_one(connection)
    .await?;

    Ok(total < MAX_OWNED_PROJECTS)
}
