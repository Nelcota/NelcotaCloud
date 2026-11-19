use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::storage::catalog::bucket_repository;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[utoipa::path(
    delete,
    path = "/storage/v1/buckets/{bucket_id}",
    tag = "storage",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("bucket_id" = Uuid, Path, description = "Bucket ID")),
    responses(
        (status = 204, description = "Delete a bucket and its files"),
        (status = 400, description = "Invalid request", body = ErrorBody),
        (status = 401, description = "Invalid credentials", body = ErrorBody),
        (status = 403, description = "Access denied", body = ErrorBody),
        (status = 404, description = "Bucket or file not found", body = ErrorBody),
        (status = 409, description = "Storage conflict", body = ErrorBody),
        (status = 503, description = "Storage unavailable", body = ErrorBody),
    )
)]
pub async fn delete_bucket(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(bucket_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    bucket_repository::delete_bucket(&state.control_plane_pool, admin.tenant_id, bucket_id).await?;

    Ok(StatusCode::NO_CONTENT)
}
