use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::team::member::ownership_changes::{MembershipTarget, leave_project};
use crate::modules::team::member::team_access::TeamAccounts;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /platform/v1/projects/{project_id}/membership`: the signed-in account leaves the
/// project. Owners leave only while another owner stays.
#[utoipa::path(
    delete,
    path = "/platform/v1/projects/{project_id}/membership",
    tag = "platform",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Id of the project")),
    responses(
        (status = 204, description = "Left the project"),
        (status = 404, description = "Not a member of this project", body = ErrorBody),
        (status = 409, description = "The last owner cannot leave", body = ErrorBody),
    )
)]
pub async fn leave(
    State(state): State<AppState>,
    account: PlatformAccount,
    Path(project_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let target = MembershipTarget {
        tenant_id: project_id,
        account_id: account.account_id,
    };
    let mut accounts = TeamAccounts::open(&state).await?;
    leave_project(&state.control_plane_pool, &mut accounts, target).await?;

    Ok(StatusCode::NO_CONTENT)
}
