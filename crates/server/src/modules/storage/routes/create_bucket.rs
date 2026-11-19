use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::storage::catalog::bucket::{Bucket, BucketInput};
use crate::modules::storage::catalog::bucket_repository;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[utoipa::path(
    post,
    path = "/storage/v1/buckets",
    tag = "storage",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = BucketInput,
    responses(
        (status = 201, description = "Create a private bucket", body = Bucket),
        (status = 400, description = "Invalid request", body = ErrorBody),
        (status = 401, description = "Invalid credentials", body = ErrorBody),
        (status = 403, description = "Access denied", body = ErrorBody),
        (status = 404, description = "Bucket or file not found", body = ErrorBody),
        (status = 409, description = "Storage conflict", body = ErrorBody),
        (status = 503, description = "Storage unavailable", body = ErrorBody),
    )
)]
pub async fn create_bucket(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(request): ValidatedJson<BucketInput>,
) -> Result<(StatusCode, Json<Bucket>), ApiError> {
    state.storage_transfer()?;
    let bucket =
        bucket_repository::create_bucket(&state.control_plane_pool, admin.tenant_id, &request.name)
            .await?;

    Ok((StatusCode::CREATED, Json(bucket)))
}
