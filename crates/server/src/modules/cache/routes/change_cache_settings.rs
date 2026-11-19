use axum::http::StatusCode;

use crate::modules::cache::management::cache_settings::{ChangeCacheSettings, set_enabled};
use crate::modules::cache::management::project_cache_owner::ProjectCacheOwner;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// Enables or disables cache for the project.
#[utoipa::path(
    put,
    path = "/platform/v1/projects/{project_id}/cache",
    tag = "cache",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Project ID")),
    request_body = ChangeCacheSettings,
    responses(
        (status = 204, description = "Cache settings updated"),
        (status = 400, description = "Invalid cache settings", body = ErrorBody),
        (status = 401, description = "Invalid platform token", body = ErrorBody),
        (status = 403, description = "Project ownership required", body = ErrorBody),
        (status = 503, description = "Cache is unavailable", body = ErrorBody),
    )
)]
pub async fn change_cache_settings(
    owner: ProjectCacheOwner,
    ValidatedJson(request): ValidatedJson<ChangeCacheSettings>,
) -> Result<StatusCode, ApiError> {
    set_enabled(&owner, request.enabled).await?;

    Ok(StatusCode::NO_CONTENT)
}
