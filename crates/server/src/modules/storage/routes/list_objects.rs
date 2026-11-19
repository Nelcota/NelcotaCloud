use axum::Json;
use axum::extract::{Path, Query, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::object::ObjectPage;
use crate::modules::storage::catalog::object_repository;
use crate::modules::storage::catalog::pagination::PageInput;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[utoipa::path(
    get,
    path = "/storage/v1/buckets/{bucket_id}/objects",
    tag = "storage",
    security(("api_key" = [], "bearer" = []), ("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("bucket_id" = Uuid, Path, description = "Bucket ID"), PageInput),
    responses(
        (status = 200, description = "List available files", body = ObjectPage),
        (status = 400, description = "Invalid request", body = ErrorBody),
        (status = 401, description = "Invalid credentials", body = ErrorBody),
        (status = 403, description = "Access denied", body = ErrorBody),
        (status = 404, description = "Bucket or file not found", body = ErrorBody),
        (status = 409, description = "Storage conflict", body = ErrorBody),
        (status = 503, description = "Storage unavailable", body = ErrorBody),
    )
)]
pub async fn list_objects(
    State(state): State<AppState>,
    caller: StorageCaller,
    Path(bucket_id): Path<Uuid>,
    Query(page): Query<PageInput>,
) -> Result<Json<ObjectPage>, ApiError> {
    state.storage_transfer()?;
    let objects =
        object_repository::list_objects(&state.control_plane_pool, caller, (bucket_id, page))
            .await?;

    Ok(Json(objects))
}
