use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::provisioning::tenant_removal::ProjectRemovalError;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /platform/v1/projects/{project_id}`: deletes the project, its users and its
/// database. Owners only.
#[utoipa::path(
    delete,
    path = "/platform/v1/projects/{project_id}",
    tag = "platform",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Id of the project")),
    responses(
        (status = 204, description = "Project deleted"),
        (status = 401, description = "Missing or invalid platform access token", body = ErrorBody),
        (status = 403, description = "Not an owner of this project", body = ErrorBody),
    )
)]
pub async fn delete_project(
    State(state): State<AppState>,
    account: PlatformAccount,
    Path(project_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let removal = state.tenant_removal();
    let removed = removal
        .remove_owned_project(project_id, account.account_id)
        .await;

    removed.map_err(|error| match error {
        ProjectRemovalError::NotOwner => ApiError::from(TenantsRejection::ProjectAccessDenied),
        other => ApiError::internal(other),
    })?;

    Ok(StatusCode::NO_CONTENT)
}
