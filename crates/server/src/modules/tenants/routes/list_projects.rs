use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::tenants::platform::membership_repository::{
    ProjectSummary, list_projects_of, refresh_member_email,
};
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `GET /platform/v1/projects`: the projects the console account is a member of.
#[utoipa::path(
    get,
    path = "/platform/v1/projects",
    tag = "platform",
    security(("platform_account" = [])),
    responses(
        (status = 200, description = "The account's projects, newest first", body = Vec<ProjectSummary>),
        (status = 401, description = "Missing or invalid platform access token", body = ErrorBody),
        (status = 503, description = "The platform API is not configured", body = ErrorBody),
    )
)]
pub async fn list_projects(
    State(state): State<AppState>,
    account: PlatformAccount,
) -> Result<Json<Vec<ProjectSummary>>, ApiError> {
    let pool = &state.control_plane_pool;
    // The console loads this list first, so it keeps each member's email current for team lists.
    refresh_member_email(pool, account.account_id, &account.email.to_lowercase())
        .await
        .map_err(ApiError::internal)?;
    let projects = list_projects_of(pool, account.account_id)
        .await
        .map_err(ApiError::internal)?;

    Ok(Json(projects))
}
