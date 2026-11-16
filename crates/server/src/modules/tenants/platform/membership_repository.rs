use serde::Serialize;
use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::platform::project_role::ProjectRole;

#[derive(Debug, thiserror::Error)]
pub enum MembershipError {
    #[error("database error while reading memberships: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored membership has an unknown role")]
    UnknownRole,
}

/// A project (tenant) as one of its members sees it in the console.
#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectSummary {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub site_url: String,
    pub role: ProjectRole,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(sqlx::FromRow)]
struct ProjectRow {
    id: Uuid,
    slug: String,
    name: String,
    site_url: String,
    role: String,
    created_at: OffsetDateTime,
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
    let Some(raw_role) = raw_role else {
        return Ok(None);
    };
    let Some(role) = ProjectRole::parse(&raw_role) else {
        return Err(MembershipError::UnknownRole);
    };

    Ok(Some(role))
}

pub async fn list_projects_of(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<Vec<ProjectSummary>, MembershipError> {
    let rows: Vec<ProjectRow> = sqlx::query_as(
        "SELECT tenants.id, tenants.slug, tenants.name, tenants.site_url, members.role, tenants.created_at \
         FROM tenant_members AS members JOIN tenants ON tenants.id = members.tenant_id \
         WHERE members.account_id = $1 ORDER BY tenants.created_at DESC",
    )
    .bind(account_id)
    .fetch_all(pool)
    .await?;

    rows.into_iter().map(ProjectRow::into_summary).collect()
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

impl ProjectRow {
    fn into_summary(self) -> Result<ProjectSummary, MembershipError> {
        let Some(role) = ProjectRole::parse(&self.role) else {
            return Err(MembershipError::UnknownRole);
        };

        Ok(ProjectSummary {
            id: self.id,
            slug: self.slug,
            name: self.name,
            site_url: self.site_url,
            role,
            created_at: self.created_at,
        })
    }
}
