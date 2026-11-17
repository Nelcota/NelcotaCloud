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
    #[error("only an owner can invite")]
    NotOwner,
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
///
/// Stored only while the inviter is still an owner (their membership locked `FOR SHARE`), so an
/// owner demoted or removed meanwhile cannot invite.
pub async fn insert_invitation(
    pool: &PgPool,
    invitation: NewInvitation<'_>,
) -> Result<PendingInvitation, InvitationError> {
    let inserted = sqlx::query_as(
        "INSERT INTO tenant_invitations (id, tenant_id, email, role, invited_by) \
         SELECT $1, $2, $3, 'member', $4 FROM tenant_members \
         WHERE tenant_id = $2 AND account_id = $4 AND role = 'owner' FOR SHARE \
         RETURNING id, email, created_at",
    )
    .bind(Uuid::new_v4())
    .bind(invitation.tenant_id)
    .bind(invitation.email)
    .bind(invitation.invited_by)
    .fetch_optional(pool)
    .await;

    match inserted {
        Ok(Some(invitation)) => Ok(invitation),
        Ok(None) => Err(InvitationError::NotOwner),
        Err(error) => Err(refusal_of(error)),
    }
}

fn refusal_of(error: sqlx::Error) -> InvitationError {
    match error.as_database_error() {
        Some(database_error) if database_error.code().as_deref() == Some(UNIQUE_VIOLATION) => {
            InvitationError::AlreadyInvited
        }
        _ => InvitationError::Database(error),
    }
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

/// An owner cancelling one of the project's invitations.
pub struct InvitationCancellation {
    pub tenant_id: Uuid,
    pub invitation_id: Uuid,
    pub owner_account_id: Uuid,
}

/// Cancels one of the project's invitations while the account is still an owner (its
/// membership locked `FOR SHARE`); `false` when there is nothing it may cancel.
pub async fn delete_project_invitation(
    pool: &PgPool,
    cancellation: InvitationCancellation,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        "DELETE FROM tenant_invitations WHERE tenant_id = $1 AND id = $2 AND EXISTS          (SELECT 1 FROM tenant_members WHERE tenant_id = $1 AND account_id = $3          AND role = 'owner' FOR SHARE)",
    )
    .bind(cancellation.tenant_id)
    .bind(cancellation.invitation_id)
    .bind(cancellation.owner_account_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}
