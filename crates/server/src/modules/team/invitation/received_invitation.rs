use serde::Serialize;
use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::tenants::platform::membership_repository::lock_team_project;

/// An invitation as the invited console account sees it.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct ReceivedInvitation {
    pub id: Uuid,
    pub project_id: Uuid,
    pub project_name: String,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

/// Who answers an invitation: it must have been sent to this account's email.
#[derive(Debug, Clone, Copy)]
pub struct InvitationAnswer<'a> {
    pub invitation_id: Uuid,
    pub account_id: Uuid,
    /// Already normalized to lowercase.
    pub email: &'a str,
}

pub async fn list_invitations_for(
    pool: &PgPool,
    email: &str,
) -> Result<Vec<ReceivedInvitation>, sqlx::Error> {
    sqlx::query_as(
        "SELECT invitations.id, invitations.tenant_id AS project_id, tenants.name AS project_name, \
         invitations.created_at FROM tenant_invitations AS invitations \
         JOIN tenants ON tenants.id = invitations.tenant_id \
         WHERE invitations.email = $1 ORDER BY invitations.created_at DESC",
    )
    .bind(email)
    .fetch_all(pool)
    .await
}

/// Joins the project and uses up the invitation in one transaction, so it cannot be accepted
/// twice; `None` when no pending invitation matches the id and email.
pub async fn accept_invitation(
    pool: &PgPool,
    answer: InvitationAnswer<'_>,
) -> Result<Option<Uuid>, sqlx::Error> {
    let mut transaction = pool.begin().await?;
    let tenant_id: Option<Uuid> =
        sqlx::query_scalar("SELECT tenant_id FROM tenant_invitations WHERE id = $1 AND email = $2")
            .bind(answer.invitation_id)
            .bind(answer.email)
            .fetch_optional(&mut *transaction)
            .await?;
    let Some(tenant_id) = tenant_id else {
        return Ok(None);
    };
    lock_team_project(&mut transaction, tenant_id).await?;
    let role: Option<String> = sqlx::query_scalar(
        "DELETE FROM tenant_invitations WHERE id = $1 AND email = $2 RETURNING role",
    )
    .bind(answer.invitation_id)
    .bind(answer.email)
    .fetch_optional(&mut *transaction)
    .await?;
    let Some(role) = role else {
        return Ok(None);
    };
    let membership = InvitedMembership {
        tenant_id,
        role: &role,
        answer: &answer,
    };
    join_unless_member(&mut transaction, membership).await?;
    transaction.commit().await?;

    Ok(Some(tenant_id))
}

struct InvitedMembership<'a> {
    tenant_id: Uuid,
    role: &'a str,
    answer: &'a InvitationAnswer<'a>,
}

/// An account that is already a member keeps its current role.
async fn join_unless_member(
    connection: &mut PgConnection,
    membership: InvitedMembership<'_>,
) -> Result<(), sqlx::Error> {
    let answer = membership.answer;
    sqlx::query(
        "INSERT INTO tenant_members (tenant_id, account_id, role, account_email) \
         VALUES ($1, $2, $3, $4) ON CONFLICT (tenant_id, account_id) DO NOTHING",
    )
    .bind(membership.tenant_id)
    .bind(answer.account_id)
    .bind(membership.role)
    .bind(answer.email)
    .execute(connection)
    .await?;

    Ok(())
}

/// Declines an invitation; `false` when no pending invitation matches the id and email.
pub async fn decline_invitation(
    pool: &PgPool,
    answer: InvitationAnswer<'_>,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM tenant_invitations WHERE id = $1 AND email = $2")
        .bind(answer.invitation_id)
        .bind(answer.email)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}
