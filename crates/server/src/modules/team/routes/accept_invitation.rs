use axum::Json;
use axum::extract::{Path, State};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::team::invitation::received_invitation::{
    InvitationAnswer, accept_invitation as join_project,
};
use crate::modules::team::member::team_access::invited_email_of;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Serialize, ToSchema)]
pub struct AcceptedInvitation {
    /// The project the account now belongs to.
    pub project_id: Uuid,
}

/// `POST /platform/v1/invitations/{invitation_id}/accept`: joins the project. The invitation
/// must have been sent to the email of the account's verified token.
#[utoipa::path(
    post,
    path = "/platform/v1/invitations/{invitation_id}/accept",
    tag = "platform",
    security(("platform_account" = [])),
    params(("invitation_id" = Uuid, Path, description = "Id of the invitation")),
    responses(
        (status = 200, description = "Joined the project", body = AcceptedInvitation),
        (status = 404, description = "No pending invitation for this account", body = ErrorBody),
    )
)]
pub async fn accept_invitation(
    State(state): State<AppState>,
    account: PlatformAccount,
    Path(invitation_id): Path<Uuid>,
) -> Result<Json<AcceptedInvitation>, ApiError> {
    let email = invited_email_of(&account)?;
    let platform_tenant_id =
        crate::modules::tenants::platform::platform_tenant::find_platform_tenant_id(&state).await?;
    let platform_pool = state
        .tenant_pools
        .pool_for(platform_tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let platform_user = crate::modules::auth::user::user_lookup::find_user_by_id(
        &platform_pool,
        account.account_id,
    )
    .await
    .map_err(ApiError::internal)?;
    let Some(platform_user) = platform_user else {
        return Err(ApiError::InvalidAccessToken);
    };

    if platform_user.email_verified_at.is_none() {
        return Err(ApiError::EmailNotVerified);
    }

    let answer = InvitationAnswer {
        invitation_id,
        account_id: account.account_id,
        email: email.as_str(),
    };
    let joined = join_project(&state.control_plane_pool, answer)
        .await
        .map_err(ApiError::internal)?;
    let Some(project_id) = joined else {
        return Err(ApiError::NotFound("invitation"));
    };

    Ok(Json(AcceptedInvitation { project_id }))
}
