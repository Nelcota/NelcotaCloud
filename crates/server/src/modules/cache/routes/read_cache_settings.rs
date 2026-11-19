use axum::Json;

use crate::modules::cache::management::cache_settings::{ProjectCacheSettings, read};
use crate::modules::cache::management::project_cache_owner::ProjectCacheOwner;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// Reads the project's cache configuration and credential metadata.
#[utoipa::path(
    get,
    path = "/platform/v1/projects/{project_id}/cache",
    tag = "cache",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Project ID")),
    responses(
        (status = 200, description = "Project cache settings", body = ProjectCacheSettings),
        (status = 401, description = "Invalid platform token", body = ErrorBody),
        (status = 403, description = "Project ownership required", body = ErrorBody),
    )
)]
pub async fn read_cache_settings(
    owner: ProjectCacheOwner,
) -> Result<Json<ProjectCacheSettings>, ApiError> {
    Ok(Json(read(&owner).await?))
}
