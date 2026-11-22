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
    pub require_email_verification: bool,
    /// Zero selects the automatic mascot. Values 1 through 32 select a catalog entry.
    #[schema(minimum = 0, maximum = 32)]
    pub mascot_id: i16,
    /// When the logo last changed; `null` while the project has none. Also the logo's version.
    #[serde(with = "time::serde::rfc3339::option")]
    pub logo_updated_at: Option<OffsetDateTime>,
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
    require_email_verification: bool,
    mascot_id: i16,
    logo_updated_at: Option<OffsetDateTime>,
    role: String,
    created_at: OffsetDateTime,
}

pub async fn list_projects_of(
    pool: &PgPool,
    account_id: Uuid,
) -> Result<Vec<ProjectSummary>, MembershipError> {
    let rows: Vec<ProjectRow> = sqlx::query_as(
        "SELECT tenants.id, tenants.slug, tenants.name, tenants.site_url, \
         tenants.require_email_verification, tenants.mascot_id, \
         logos.updated_at AS logo_updated_at, members.role, tenants.created_at \
         FROM tenant_members AS members JOIN tenants ON tenants.id = members.tenant_id \
         LEFT JOIN tenant_logos AS logos ON logos.tenant_id = tenants.id \
         WHERE members.account_id = $1 ORDER BY tenants.created_at DESC",
    )
    .bind(account_id)
    .fetch_all(pool)
    .await?;

    rows.into_iter().map(ProjectRow::into_summary).collect()
}

impl ProjectRow {
    fn into_summary(self) -> Result<ProjectSummary, MembershipError> {
        let role = ProjectRole::parse(&self.role).ok_or(MembershipError::UnknownRole)?;

        Ok(ProjectSummary {
            id: self.id,
            slug: self.slug,
            name: self.name,
            site_url: self.site_url,
            require_email_verification: self.require_email_verification,
            mascot_id: self.mascot_id,
            logo_updated_at: self.logo_updated_at,
            role,
            created_at: self.created_at,
        })
    }
}
