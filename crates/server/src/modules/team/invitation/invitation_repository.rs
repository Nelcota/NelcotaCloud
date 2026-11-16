use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

/// Postgres' code for a unique violation: the email already has a pending invitation.
const UNIQUE_VIOLATION: &str = "23505";

#[derive(Debug, thiserror::Error)]
pub enum InvitationError {
    #[error("this email already has a pending invitation")]
    AlreadyInvited,
    #[error("database error while storing an invitation: {0}")]
    Database(#[from] sqlx::Error),
}

/// A pending invitation as the project's team sees it.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct PendingInvitation {
    pub id: Uuid,
    pub email: String,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

pub struct NewInvitation<'a> {
    pub tenant_id: Uuid,
    /// Already normalized to lowercase.
    pub email: &'a str,
    pub invited_by: Uuid,
}

/// Invited people join as members; ownership is not handed out by invitation.
pub async fn insert_invitation(
    pool: &PgPool,
    invitation: NewInvitation<'_>,
) -> Result<PendingInvitation, InvitationError> {
    let inserted = sqlx::query_as(
        "INSERT INTO tenant_invitations (id, tenant_id, email, role, invited_by) \
         VALUES ($1, $2, $3, 'member', $4) RETURNING id, email, created_at",
    )
    .bind(Uuid::new_v4())
    .bind(invitation.tenant_id)
    .bind(invitation.email)
    .bind(invitation.invited_by)
    .fetch_one(pool)
    .await;

    inserted.map_err(|error| match error.as_database_error() {
        Some(database_error) if database_error.code().as_deref() == Some(UNIQUE_VIOLATION) => {
            InvitationError::AlreadyInvited
        }
        _ => InvitationError::Database(error),
    })
}

pub async fn list_project_invitations(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<PendingInvitation>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, email, created_at FROM tenant_invitations WHERE tenant_id = $1 ORDER BY created_at",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await
}

/// Cancels one of the project's invitations; `false` when it does not exist (anymore).
pub async fn delete_project_invitation(
    pool: &PgPool,
    tenant_id: Uuid,
    invitation_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM tenant_invitations WHERE tenant_id = $1 AND id = $2")
        .bind(tenant_id)
        .bind(invitation_id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}
