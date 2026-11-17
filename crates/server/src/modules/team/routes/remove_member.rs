use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::team::member::team_member_repository::remove_team_member;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_access::require_owner;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /platform/v1/projects/{project_id}/members/{account_id}`: takes a member's access
/// away. Owners only; owners themselves cannot be removed.
#[utoipa::path(
    delete,
    path = "/platform/v1/projects/{project_id}/members/{account_id}",
    tag = "platform",
    security(("platform_account" = [])),
    params(
        ("project_id" = Uuid, Path, description = "Id of the project"),
        ("account_id" = Uuid, Path, description = "Console account of the member"),
    ),
    responses(
        (status = 204, description = "Member removed"),
        (status = 403, description = "Not an owner of this project", body = ErrorBody),
        (status = 404, description = "No such member (owners are never removed)", body = ErrorBody),
    )
)]
pub async fn remove_member(
    State(state): State<AppState>,
    account: PlatformAccount,
    Path((project_id, member_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    require_owner(&state.control_plane_pool, project_id, &account).await?;
    let is_removed = remove_team_member(&state.control_plane_pool, project_id, member_id).await?;

    if is_removed == false {
        return Err(ApiError::NotFound("member"));
    }

    Ok(StatusCode::NO_CONTENT)
}
