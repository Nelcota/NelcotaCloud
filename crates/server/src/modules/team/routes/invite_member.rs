use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::team::invitation::invitation_email::{InvitationNotice, send_invitation_email};
use crate::modules::team::invitation::invitation_repository::{
    InvitationError, NewInvitation, PendingInvitation, insert_invitation,
};
use crate::modules::team::member::team_member_repository::is_member_email;
use crate::modules::team::rejection::team_rejection::TeamRejection;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_access::require_owner;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct InvitationBody {
    #[validate(length(min = 1, max = 254))]
    pub email: String,
}

/// `POST /platform/v1/projects/{project_id}/invitations`: invites someone to manage the
/// project as a member, and emails them. Owners only.
#[utoipa::path(
    post,
    path = "/platform/v1/projects/{project_id}/invitations",
    tag = "platform",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Id of the project")),
    request_body = InvitationBody,
    responses(
        (status = 201, description = "Invitation created and emailed", body = PendingInvitation),
        (status = 400, description = "Invalid email", body = ErrorBody),
        (status = 403, description = "Not an owner of this project", body = ErrorBody),
        (status = 409, description = "Already a member, or already invited", body = ErrorBody),
        (status = 429, description = "Too many invitations", body = ErrorBody),
    )
)]
pub async fn invite_member(
    State(state): State<AppState>,
    account: PlatformAccount,
    ClientIp(client_ip): ClientIp,
    Path(project_id): Path<Uuid>,
    ValidatedJson(body): ValidatedJson<InvitationBody>,
) -> Result<(StatusCode, Json<PendingInvitation>), ApiError> {
    require_owner(&state.control_plane_pool, project_id, &account).await?;
    let Ok(email) = EmailAddress::parse(&body.email) else {
        return Err(ApiError::InvalidRequest("invalid email address".to_owned()));
    };
    let attempt = Attempt {
        tenant_id: project_id,
        email: email.as_str(),
        client_ip,
    };
    state.rate_limits.check_email(&attempt)?;
    state
        .rate_limits
        .invitations
        .check(Uuid::nil(), account.account_id)?;
    let invitation = store_invitation(&state, &account, project_id, &email).await?;
    let notice = InvitationNotice {
        project_id,
        recipient: email.as_str(),
        inviter_email: &account.email,
    };
    send_invitation_email(&state, notice).await?;

    Ok((StatusCode::CREATED, Json(invitation)))
}

async fn store_invitation(
    state: &AppState,
    account: &PlatformAccount,
    project_id: Uuid,
    email: &EmailAddress,
) -> Result<PendingInvitation, ApiError> {
    let pool = &state.control_plane_pool;
    let is_member = is_member_email(pool, project_id, email.as_str()).await?;

    if is_member {
        return Err(ApiError::from(TeamRejection::AlreadyMember));
    }

    let invitation = NewInvitation {
        tenant_id: project_id,
        email: email.as_str(),
        invited_by: account.account_id,
    };

    insert_invitation(pool, invitation)
        .await
        .map_err(|error| match error {
            InvitationError::AlreadyInvited => ApiError::from(TeamRejection::AlreadyInvited),
            InvitationError::NotOwner => ApiError::from(TenantsRejection::ProjectAccessDenied),
            InvitationError::Database(_) => ApiError::internal(error),
        })
}
