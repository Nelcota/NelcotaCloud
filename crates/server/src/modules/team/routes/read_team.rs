use axum::Json;
use axum::extract::{Path, State};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::team::invitation::invitation_repository::{
    PendingInvitation, list_project_invitations,
};
use crate::modules::team::member::team_member_repository::{TeamMember, list_team_members};
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_access::role_in_project;
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[derive(Serialize, ToSchema)]
pub struct TeamView {
    pub members: Vec<TeamMember>,
    pub invitations: Vec<PendingInvitation>,
    /// Whether the caller may invite and remove people (owners only).
    pub can_manage: bool,
}

/// `GET /platform/v1/projects/{project_id}/team`: who manages the project, and who is invited.
#[utoipa::path(
    get,
    path = "/platform/v1/projects/{project_id}/team",
    tag = "platform",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Id of the project")),
    responses(
        (status = 200, description = "Members and pending invitations", body = TeamView),
        (status = 401, description = "Missing or invalid platform access token", body = ErrorBody),
        (status = 403, description = "Not a member of this project", body = ErrorBody),
    )
)]
pub async fn read_team(
    State(state): State<AppState>,
    account: PlatformAccount,
    Path(project_id): Path<Uuid>,
) -> Result<Json<TeamView>, ApiError> {
    let role = role_in_project(&state.control_plane_pool, project_id, &account).await?;
    let pool = &state.control_plane_pool;
    let members = list_team_members(pool, project_id)
        .await
        .map_err(ApiError::internal)?;
    let invitations = list_project_invitations(pool, project_id).await?;

    Ok(Json(TeamView {
        members,
        invitations,
        can_manage: role == ProjectRole::Owner,
    }))
}
