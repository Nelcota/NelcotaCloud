use axum::Json;
use axum::http::StatusCode;

use crate::modules::cache::management::cache_credentials::{
    CreateCacheCredential, IssuedCacheCredential, issue,
};
use crate::modules::cache::management::project_cache_owner::ProjectCacheOwner;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// Issues a cache-only credential and returns its token once.
#[utoipa::path(
    post,
    path = "/platform/v1/projects/{project_id}/cache/credentials",
    tag = "cache",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Project ID")),
    request_body = CreateCacheCredential,
    responses(
        (status = 201, description = "Issued cache credential", body = IssuedCacheCredential),
        (status = 400, description = "Invalid credential name", body = ErrorBody),
        (status = 401, description = "Invalid platform token", body = ErrorBody),
        (status = 403, description = "Project ownership required", body = ErrorBody),
        (status = 409, description = "Project cache is disabled or credential limit reached", body = ErrorBody),
        (status = 503, description = "Cache is unavailable", body = ErrorBody),
    )
)]
pub async fn create_cache_credential(
    owner: ProjectCacheOwner,
    ValidatedJson(request): ValidatedJson<CreateCacheCredential>,
) -> Result<(StatusCode, Json<IssuedCacheCredential>), ApiError> {
    let credential = issue(&owner, request).await?;

    Ok((StatusCode::CREATED, Json(credential)))
}
