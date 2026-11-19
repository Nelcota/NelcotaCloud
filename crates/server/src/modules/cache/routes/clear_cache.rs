use axum::http::StatusCode;

use crate::modules::cache::management::cache_settings::clear;
use crate::modules::cache::management::project_cache_owner::ProjectCacheOwner;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// Invalidates the active cache entries of this project.
#[utoipa::path(
    post,
    path = "/platform/v1/projects/{project_id}/cache/clear",
    tag = "cache",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Project ID")),
    responses(
        (status = 204, description = "Project cache cleared"),
        (status = 401, description = "Invalid platform token", body = ErrorBody),
        (status = 403, description = "Project ownership required", body = ErrorBody),
        (status = 409, description = "Project cache is disabled", body = ErrorBody),
    )
)]
pub async fn clear_cache(owner: ProjectCacheOwner) -> Result<StatusCode, ApiError> {
    clear(&owner).await?;

    Ok(StatusCode::NO_CONTENT)
}
