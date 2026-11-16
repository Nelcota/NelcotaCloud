use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::user::email_address::EmailAddress;
use crate::modules::tenants::platform::membership_repository::find_project_role;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::shared::http::api_error::ApiError;

/// The account's role in the project, checked on every request; 403 for non-members.
pub async fn role_in_project(
    state: &AppState,
    project_id: Uuid,
    account: &PlatformAccount,
) -> Result<ProjectRole, ApiError> {
    let role = find_project_role(&state.control_plane_pool, project_id, account.account_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(role) = role else {
        return Err(ApiError::ProjectAccessDenied);
    };

    Ok(role)
}

/// Only owners invite and remove people.
pub async fn require_owner(
    state: &AppState,
    project_id: Uuid,
    account: &PlatformAccount,
) -> Result<(), ApiError> {
    let role = role_in_project(state, project_id, account).await?;

    if role != ProjectRole::Owner {
        return Err(ApiError::ProjectAccessDenied);
    }

    Ok(())
}

/// The token's email, normalized like invitation emails; a token without a usable email
/// matches no invitation.
pub fn invited_email_of(account: &PlatformAccount) -> Result<EmailAddress, ApiError> {
    EmailAddress::parse(&account.email).map_err(|_| ApiError::NotFound("invitation"))
}
