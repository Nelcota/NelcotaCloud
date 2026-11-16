use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::team::invitation::invitation_repository::delete_project_invitation;
use crate::modules::team::member::team_access::require_owner;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /platform/v1/projects/{project_id}/invitations/{invitation_id}`: withdraws a
/// pending invitation. Owners only.
#[utoipa::path(
    delete,
    path = "/platform/v1/projects/{project_id}/invitations/{invitation_id}",
    tag = "platform",
    security(("platform_account" = [])),
    params(
        ("project_id" = Uuid, Path, description = "Id of the project"),
        ("invitation_id" = Uuid, Path, description = "Id of the invitation"),
    ),
    responses(
        (status = 204, description = "Invitation withdrawn"),
        (status = 403, description = "Not an owner of this project", body = ErrorBody),
        (status = 404, description = "No such pending invitation", body = ErrorBody),
    )
)]
pub async fn cancel_invitation(
    State(state): State<AppState>,
    account: PlatformAccount,
    Path((project_id, invitation_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    require_owner(&state, project_id, &account).await?;
    let is_deleted =
        delete_project_invitation(&state.control_plane_pool, project_id, invitation_id)
            .await
            .map_err(ApiError::internal)?;

    if is_deleted == false {
        return Err(ApiError::NotFound("invitation"));
    }

    Ok(StatusCode::NO_CONTENT)
}
