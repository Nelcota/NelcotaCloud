use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::platform::project_role::ProjectRole;

#[derive(Debug, thiserror::Error)]
pub enum MembershipError {
    #[error("database error while reading memberships: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored membership has an unknown role")]
    UnknownRole,
}

pub async fn insert_membership(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    account_id: Uuid,
    role: ProjectRole,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO tenant_members (tenant_id, account_id, role) VALUES ($1, $2, $3)")
        .bind(tenant_id)
        .bind(account_id)
        .bind(role.as_str())
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

    parse_role(raw_role)
}

/// Like `find_project_role`, holding the membership until the caller's transaction ends, so
/// role changes and ownership transfers (which lock every membership) wait for it.
pub async fn lock_project_role(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    account_id: Uuid,
) -> Result<Option<ProjectRole>, MembershipError> {
    let raw_role: Option<String> = sqlx::query_scalar(
        "SELECT role FROM tenant_members WHERE tenant_id = $1 AND account_id = $2 FOR SHARE",
    )
    .bind(tenant_id)
    .bind(account_id)
    .fetch_optional(connection)
    .await?;

    parse_role(raw_role)
}

fn parse_role(raw_role: Option<String>) -> Result<Option<ProjectRole>, MembershipError> {
    let Some(raw_role) = raw_role else {
        return Ok(None);
    };
    let Some(role) = ProjectRole::parse(&raw_role) else {
        return Err(MembershipError::UnknownRole);
    };

    Ok(Some(role))
}

/// Projects owned by the account, counted under a lock on its memberships so two concurrent
/// creations cannot both pass the limit.
pub async fn count_owned_projects(
    connection: &mut PgConnection,
    account_id: Uuid,
) -> Result<i64, sqlx::Error> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))")
        .bind(account_id)
        .execute(&mut *connection)
        .await?;

    sqlx::query_scalar(
        "SELECT count(*) FROM tenant_members WHERE account_id = $1 AND role = 'owner'",
    )
    .bind(account_id)
    .fetch_one(connection)
    .await
}
