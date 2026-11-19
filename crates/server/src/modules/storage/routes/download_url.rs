use axum::Json;
use axum::extract::{Path, State};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::storage::access::storage_caller::StorageCaller;
use crate::modules::storage::transfer::signed_transfer::SignedDownload;
use crate::shared::http::api_error::{ApiError, ErrorBody};

#[utoipa::path(
    post,
    path = "/storage/v1/objects/{object_id}/download-url",
    tag = "storage",
    security(("api_key" = [], "bearer" = []), ("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("object_id" = Uuid, Path, description = "Object ID")),
    responses(
        (status = 200, description = "Sign a private GET for a file", body = SignedDownload),
        (status = 400, description = "Invalid request", body = ErrorBody),
        (status = 401, description = "Invalid credentials", body = ErrorBody),
        (status = 403, description = "Access denied", body = ErrorBody),
        (status = 404, description = "Bucket or file not found", body = ErrorBody),
        (status = 409, description = "Storage conflict", body = ErrorBody),
        (status = 503, description = "Storage unavailable", body = ErrorBody),
    )
)]
pub async fn download_url(
    State(state): State<AppState>,
    caller: StorageCaller,
    Path(object_id): Path<Uuid>,
) -> Result<Json<SignedDownload>, ApiError> {
    let signed = state
        .storage_transfer()?
        .download(caller, object_id)
        .await?;

    Ok(Json(signed))
}
