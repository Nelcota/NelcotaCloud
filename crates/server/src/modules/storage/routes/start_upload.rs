use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::catalog::file_input::FileInput;
use crate::modules::storage::object_store::signed_upload::SignedUpload;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::map_rejection;

#[utoipa::path(
    post,
    path = "/storage/v1/buckets/{bucket_id}/uploads",
    tag = "storage",
    security(("api_key" = [], "bearer" = []), ("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("bucket_id" = Uuid, Path, description = "Bucket ID")),
    request_body = FileInput,
    responses(
        (status = 201, description = "Reserve a file and sign a direct PUT", body = SignedUpload),
        (status = 400, description = "Invalid request", body = ErrorBody),
        (status = 401, description = "Invalid credentials", body = ErrorBody),
        (status = 403, description = "Access denied", body = ErrorBody),
        (status = 404, description = "Bucket or file not found", body = ErrorBody),
        (status = 409, description = "Storage conflict", body = ErrorBody),
        (status = 413, description = "File is too large", body = ErrorBody),
        (status = 503, description = "Storage unavailable", body = ErrorBody),
    )
)]
pub async fn start_upload(
    State(state): State<AppState>,
    caller: StorageCaller,
    Path(bucket_id): Path<Uuid>,
    input: Result<Json<FileInput>, JsonRejection>,
) -> Result<(StatusCode, Json<SignedUpload>), ApiError> {
    let Json(input) = input.map_err(|error| map_rejection(&error))?;
    let transfer = state.storage_transfer()?;
    let signed = transfer.start(caller, (bucket_id, &input)).await?;

    Ok((StatusCode::CREATED, Json(signed)))
}
