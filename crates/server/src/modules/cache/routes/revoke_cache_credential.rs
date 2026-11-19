use axum::http::StatusCode;

use crate::modules::cache::management::cache_credentials::revoke;
use crate::modules::cache::management::project_cache_owner::ProjectCacheOwner;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// Revokes a credential belonging to the project.
#[utoipa::path(
    delete,
    path = "/platform/v1/projects/{project_id}/cache/credentials/{credential_id}",
    tag = "cache",
    security(("platform_account" = [])),
    params(("project_id" = Uuid, Path, description = "Project ID"), ("credential_id" = Uuid, Path, description = "Credential ID")),
    responses(
        (status = 204, description = "Cache credential revoked"),
        (status = 401, description = "Invalid platform token", body = ErrorBody),
        (status = 403, description = "Project ownership required", body = ErrorBody),
        (status = 404, description = "Credential not found", body = ErrorBody),
    )
)]
pub async fn revoke_cache_credential(owner: ProjectCacheOwner) -> Result<StatusCode, ApiError> {
    let credential_id = owner
        .credential_id
        .ok_or(ApiError::NotFound("cache credential"))?;
    revoke(&owner, credential_id).await?;

    Ok(StatusCode::NO_CONTENT)
}
