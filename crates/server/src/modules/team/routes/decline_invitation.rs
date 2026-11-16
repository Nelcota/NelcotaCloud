use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::team::invitation::received_invitation::{
    InvitationAnswer, decline_invitation as refuse,
};
use crate::modules::team::member::team_access::invited_email_of;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /platform/v1/invitations/{invitation_id}`: declines an invitation sent to the
/// account's email.
#[utoipa::path(
    delete,
    path = "/platform/v1/invitations/{invitation_id}",
    tag = "platform",
    security(("platform_account" = [])),
    params(("invitation_id" = Uuid, Path, description = "Id of the invitation")),
    responses(
        (status = 204, description = "Invitation declined"),
        (status = 404, description = "No pending invitation for this account", body = ErrorBody),
    )
)]
pub async fn decline_invitation(
    State(state): State<AppState>,
    account: PlatformAccount,
    Path(invitation_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let email = invited_email_of(&account)?;
    let answer = InvitationAnswer {
        invitation_id,
        account_id: account.account_id,
        email: email.as_str(),
    };
    let is_declined = refuse(&state.control_plane_pool, answer)
        .await
        .map_err(ApiError::internal)?;

    if is_declined == false {
        return Err(ApiError::NotFound("invitation"));
    }

    Ok(StatusCode::NO_CONTENT)
}
