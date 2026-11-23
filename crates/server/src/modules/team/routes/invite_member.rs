use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::json;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::integration::team_notifications::EmailAddress;
use crate::modules::team::invitation::invitation_delivery::{check_delivery_quota, deliver};
use crate::modules::team::invitation::invitation_repository::{
    InvitationError, NewInvitation, PendingInvitation, insert_invitation,
};
use crate::modules::team::rejection::team_rejection::TeamRejection;
use crate::modules::tenants::access::admin_actor::AdminActor;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_access::require_owner;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::http::validated_json::ValidatedJson;
use crate::shared::rate_limiting::attempt_limiter::Attempt;

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
        (status = 201, description = "Invitation created with the result of the email attempt", body = PendingInvitation),
        (status = 400, description = "Invalid email", body = ErrorBody),
        (status = 403, description = "Not an owner of this project", body = ErrorBody),
        (status = 409, description = "Already a member, or already invited", body = ErrorBody),
        (status = 429, description = "Too many invitations", body = ErrorBody),
    )
)]
pub async fn invite_member(
    State(state): State<AppState>,
    account: PlatformAccount,
    origin: RequestOrigin,
    Path(project_id): Path<Uuid>,
    ValidatedJson(body): ValidatedJson<InvitationBody>,
) -> Result<(StatusCode, Json<PendingInvitation>), ApiError> {
    let client_ip = origin.client_ip;
    require_owner(&state.control_plane_pool, project_id, &account).await?;
    let email = EmailAddress::parse(&body.email)
        .map_err(|_| ApiError::InvalidRequest("invalid email address".to_owned()))?;
    let attempt = Attempt {
        tenant_id: project_id,
        email: email.as_str(),
        client_ip,
    };
    check_delivery_quota(&state, account.account_id, &attempt).await?;
    let attempt_id = Uuid::new_v4();
    let invitation = store_invitation(&state, &account, (project_id, attempt_id), &email).await?;
    let change = ProjectChange {
        tenant_id: project_id,
        author: (AdminActor::ConsoleAccount(account.account_id), &origin),
        action: AuditAction::MemberInvited,
        details: json!({ "email": email.as_str() }),
    };
    record_project_change(&state.tenant_pools, change).await;
    let invitation = deliver(&state, invitation, (project_id, attempt_id), &account.email).await?;

    Ok((StatusCode::CREATED, Json(invitation)))
}

async fn store_invitation(
    state: &AppState,
    account: &PlatformAccount,
    (project_id, delivery_attempt): (Uuid, Uuid),
    email: &EmailAddress,
) -> Result<PendingInvitation, ApiError> {
    let invitation = NewInvitation {
        tenant_id: project_id,
        email: email.as_str(),
        invited_by: account.account_id,
        delivery_attempt,
    };

    insert_invitation(&state.control_plane_pool, invitation)
        .await
        .map_err(|error| match error {
            InvitationError::AlreadyInvited => ApiError::from(TeamRejection::AlreadyInvited),
            InvitationError::AlreadyMember => ApiError::from(TeamRejection::AlreadyMember),
            InvitationError::NotOwner => ApiError::from(TenantsRejection::ProjectAccessDenied),
            InvitationError::Database(_) => ApiError::internal(error),
        })
}
