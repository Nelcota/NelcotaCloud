use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::platform::membership_repository::MembershipError;
use crate::modules::tenants::platform::project_role::ProjectRole;

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
