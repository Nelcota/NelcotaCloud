use axum::Json;
use axum::extract::{Path, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::object::StorageObject;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[utoipa::path(
    post,
    path = "/storage/v1/objects/{object_id}/complete",
    tag = "storage",
    security(("api_key" = [], "bearer" = []), ("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("object_id" = Uuid, Path, description = "Object ID")),
    responses(
        (status = 200, description = "Confirm a successful upload", body = StorageObject),
        (status = 400, description = "Invalid request", body = ErrorBody),
        (status = 401, description = "Invalid credentials", body = ErrorBody),
        (status = 403, description = "Access denied", body = ErrorBody),
        (status = 404, description = "Bucket or file not found", body = ErrorBody),
        (status = 409, description = "Storage conflict", body = ErrorBody),
        (status = 503, description = "Storage unavailable", body = ErrorBody),
    )
)]
pub async fn complete_upload(
    State(state): State<AppState>,
    caller: StorageCaller,
    Path(object_id): Path<Uuid>,
) -> Result<Json<StorageObject>, ApiError> {
    let object = state
        .storage_transfer()?
        .complete(caller, object_id)
        .await?;

    Ok(Json(object))
}
