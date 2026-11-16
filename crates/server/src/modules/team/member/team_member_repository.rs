use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::platform::project_role::ProjectRole;

#[derive(Debug, thiserror::Error)]
pub enum TeamMemberError {
    #[error("database error while reading team members: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored membership has an unknown role")]
    UnknownRole,
}

/// A console account with access to the project.
#[derive(Debug, Serialize, ToSchema)]
pub struct TeamMember {
    pub account_id: Uuid,
    /// As of the member's last console visit; empty until then.
    pub email: String,
    pub role: ProjectRole,
    #[serde(with = "time::serde::rfc3339")]
    pub joined_at: OffsetDateTime,
}

#[derive(sqlx::FromRow)]
struct TeamMemberRow {
    account_id: Uuid,
    account_email: String,
    role: String,
    created_at: OffsetDateTime,
}

/// Owners first, then by the date they joined.
pub async fn list_team_members(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<TeamMember>, TeamMemberError> {
    let rows: Vec<TeamMemberRow> = sqlx::query_as(
        "SELECT account_id, account_email, role, created_at FROM tenant_members \
         WHERE tenant_id = $1 ORDER BY role = 'owner' DESC, created_at",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;

    rows.into_iter().map(TeamMemberRow::into_member).collect()
}

/// Whether an account with this email already belongs to the project.
pub async fn is_member_email(
    pool: &PgPool,
    tenant_id: Uuid,
    email: &str,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = $1 AND account_email = $2)",
    )
    .bind(tenant_id)
    .bind(email)
    .fetch_one(pool)
    .await
}

/// Removes a member. Owners are never removed this way, so a project always keeps its owner;
/// `false` when no such member exists.
pub async fn remove_team_member(
    pool: &PgPool,
    tenant_id: Uuid,
    account_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        "DELETE FROM tenant_members WHERE tenant_id = $1 AND account_id = $2 AND role = 'member'",
    )
    .bind(tenant_id)
    .bind(account_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

impl TeamMemberRow {
    fn into_member(self) -> Result<TeamMember, TeamMemberError> {
        let Some(role) = ProjectRole::parse(&self.role) else {
            return Err(TeamMemberError::UnknownRole);
        };

        Ok(TeamMember {
            account_id: self.account_id,
            email: self.account_email,
            role,
            joined_at: self.created_at,
        })
    }
}
