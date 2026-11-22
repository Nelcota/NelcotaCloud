use std::time::Duration;

use axum::http::StatusCode;
use tokio::time::timeout;
use uuid::Uuid;

use super::invitation_email::{InvitationNotice, send_invitation_email};
use super::invitation_repository::{InvitationDeliveryStatus, PendingInvitation};
use crate::app_state::AppState;
use crate::modules::auth::rate_limiting::shared_auth_limits::SharedAuthLimits;
use crate::modules::tenants::platform::membership_repository::lock_team_project;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::{ApiError, Rejection};
use crate::shared::rate_limiting::attempt_limiter::Attempt;

// An interrupted request leaves a shorter lease than the next operator's retry threshold.
const DELIVERY_TIMEOUT: Duration = Duration::from_secs(20);

pub async fn check_delivery_quota(
    state: &AppState,
    account_id: Uuid,
    attempt: &Attempt<'_>,
) -> Result<(), ApiError> {
    state.rate_limits.auth.check_email(attempt).await?;
    state
        .rate_limits
        .invitations
        .check(Uuid::nil(), account_id)?;

    Ok(())
}

pub async fn deliver(
    state: &AppState,
    mut invitation: PendingInvitation,
    (project_id, attempt_id): (Uuid, Uuid),
    inviter_email: &str,
) -> Result<PendingInvitation, ApiError> {
    let notice = InvitationNotice {
        project_id,
        recipient: &invitation.email,
        inviter_email,
    };
    let status = match timeout(DELIVERY_TIMEOUT, send_invitation_email(state, notice)).await {
        Ok(Ok(())) => InvitationDeliveryStatus::Sent,
        Ok(Err(error)) => {
            tracing::warn!(%error, "invitation email delivery failed");
            InvitationDeliveryStatus::Failed
        }
        Err(_) => {
            tracing::warn!("invitation email delivery timed out");
            InvitationDeliveryStatus::Failed
        }
    };
    sqlx::query(
        "UPDATE tenant_invitations
         SET delivery_status = $3, delivery_attempt = NULL, delivery_started_at = NULL
         WHERE id = $1 AND delivery_attempt = $2",
    )
    .bind(invitation.id)
    .bind(attempt_id)
    .bind(status)
    .execute(&state.control_plane_pool)
    .await?;
    invitation.delivery_status = status;

    Ok(invitation)
}

pub async fn claim_resend(
    state: &AppState,
    account: &PlatformAccount,
    (project_id, invitation_id): (Uuid, Uuid),
    attempt_id: Uuid,
    client_ip: std::net::IpAddr,
) -> Result<PendingInvitation, ApiError> {
    let pool = &state.control_plane_pool;
    let mut transaction = pool.begin().await?;
    lock_team_project(&mut transaction, project_id).await?;
    let role: Option<String> = sqlx::query_scalar(
        "SELECT role FROM tenant_members WHERE tenant_id = $1 AND account_id = $2",
    )
    .bind(project_id)
    .bind(account.account_id)
    .fetch_optional(&mut *transaction)
    .await?;

    if role.as_deref() != Some("owner") {
        return Err(TenantsRejection::ProjectAccessDenied.into());
    }

    let invitation: Option<PendingInvitation> = sqlx::query_as(
        "UPDATE tenant_invitations
         SET delivery_status = 'sending', delivery_attempt = $3, delivery_started_at = clock_timestamp()
         WHERE tenant_id = $1 AND id = $2
             AND (delivery_status != 'sending' OR delivery_started_at <= now() - interval '1 minute')
         RETURNING id, email, created_at, delivery_status",
    )
    .bind(project_id)
    .bind(invitation_id)
    .bind(attempt_id)
    .fetch_optional(&mut *transaction)
    .await?;
    let Some(invitation) = invitation else {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM tenant_invitations WHERE tenant_id = $1 AND id = $2)",
        )
        .bind(project_id)
        .bind(invitation_id)
        .fetch_one(&mut *transaction)
        .await?;

        if exists {
            return Err(ApiError::Rejected(Rejection {
                status: StatusCode::CONFLICT,
                code: "invitation_delivery_in_progress",
                message: "An invitation delivery is already in progress.".to_owned(),
            }));
        }

        return Err(ApiError::NotFound("invitation"));
    };
    let attempt = Attempt {
        tenant_id: project_id,
        email: &invitation.email,
        client_ip,
    };
    SharedAuthLimits::check_email_in(&mut transaction, &attempt).await?;
    state
        .rate_limits
        .invitations
        .check(Uuid::nil(), account.account_id)?;
    transaction.commit().await?;

    Ok(invitation)
}
