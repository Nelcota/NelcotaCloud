use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::bucket::Bucket;
use crate::modules::storage::catalog::bucket_repository;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[utoipa::path(
    get,
    path = "/storage/v1/buckets",
    tag = "storage",
    security(("api_key" = [], "bearer" = []), ("api_key" = []), ("platform_account" = [], "project" = [])),
    responses(
        (status = 200, description = "List private buckets", body = [Bucket]),
        (status = 400, description = "Invalid request", body = ErrorBody),
        (status = 401, description = "Invalid credentials", body = ErrorBody),
        (status = 403, description = "Access denied", body = ErrorBody),
        (status = 404, description = "Bucket or file not found", body = ErrorBody),
        (status = 409, description = "Storage conflict", body = ErrorBody),
        (status = 503, description = "Storage unavailable", body = ErrorBody),
    )
)]
pub async fn list_buckets(
    State(state): State<AppState>,
    caller: StorageCaller,
) -> Result<Json<Vec<Bucket>>, ApiError> {
    state.require_storage()?;
    let buckets =
        bucket_repository::list_buckets(&state.control_plane_pool, caller.tenant_id).await?;

    Ok(Json(buckets))
}
