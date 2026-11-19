use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::tenants::platform::membership_repository::find_project_role;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;

/// The account's role in the project, checked on every request; 403 for non-members.
pub async fn role_in_project(
    control_plane_pool: &PgPool,
    project_id: Uuid,
    account: &PlatformAccount,
) -> Result<ProjectRole, ApiError> {
    let role = find_project_role(control_plane_pool, project_id, account.account_id)
        .await
        .map_err(ApiError::internal)?;
    let role = role.ok_or(TenantsRejection::ProjectAccessDenied)?;

    Ok(role)
}

/// Only owners invite and remove people, change roles and delete the project.
pub async fn require_owner(
    control_plane_pool: &PgPool,
    project_id: Uuid,
    account: &PlatformAccount,
) -> Result<(), ApiError> {
    let role = role_in_project(control_plane_pool, project_id, account).await?;

    if role != ProjectRole::Owner {
        return Err(ApiError::from(TenantsRejection::ProjectAccessDenied));
    }

    Ok(())
}
