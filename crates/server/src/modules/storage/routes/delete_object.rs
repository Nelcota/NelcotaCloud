use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::object_repository;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[utoipa::path(
    delete,
    path = "/storage/v1/objects/{object_id}",
    tag = "storage",
    security(("api_key" = [], "bearer" = []), ("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("object_id" = Uuid, Path, description = "Object ID")),
    responses(
        (status = 204, description = "Remove a file and queue its physical deletion"),
        (status = 400, description = "Invalid request", body = ErrorBody),
        (status = 401, description = "Invalid credentials", body = ErrorBody),
        (status = 403, description = "Access denied", body = ErrorBody),
        (status = 404, description = "Bucket or file not found", body = ErrorBody),
        (status = 409, description = "Storage conflict", body = ErrorBody),
        (status = 503, description = "Storage unavailable", body = ErrorBody),
    )
)]
pub async fn delete_object(
    State(state): State<AppState>,
    caller: StorageCaller,
    Path(object_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    object_repository::delete_object(&state.control_plane_pool, caller, object_id).await?;

    Ok(StatusCode::NO_CONTENT)
}
