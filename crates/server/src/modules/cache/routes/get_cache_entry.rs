use axum::Json;
use axum::extract::State;

use crate::app_state::AppState;
use crate::modules::cache::access::CacheAccess;
use crate::modules::cache::entries::cache_payload::{CacheEntry, CacheKeyRequest};
use crate::modules::cache::rejection::CacheRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// Reads a cached JSON value.
#[utoipa::path(
    post,
    path = "/cache/v1/get",
    tag = "cache",
    security(("cache_credential" = [])),
    request_body = CacheKeyRequest,
    responses(
        (status = 200, description = "Cache hit", body = CacheEntry),
        (status = 404, description = "Cache miss", body = ErrorBody),
        (status = 400, description = "Invalid cache request", body = ErrorBody),
        (status = 401, description = "Invalid cache credential", body = ErrorBody),
        (status = 409, description = "Project cache is disabled", body = ErrorBody),
        (status = 413, description = "Cache payload is too large", body = ErrorBody),
        (status = 429, description = "Project quota reached", body = ErrorBody),
        (status = 503, description = "Cache is unavailable", body = ErrorBody),
    )
)]
pub async fn get_cache_entry(
    State(state): State<AppState>,
    access: CacheAccess,
    ValidatedJson(request): ValidatedJson<CacheKeyRequest>,
) -> Result<Json<CacheEntry>, ApiError> {
    let store = state
        .cache_store
        .as_ref()
        .ok_or(CacheRejection::Unavailable)?;
    let key = access.entry_key(&request.key);
    let value = store.get(&key).await?;

    Ok(Json(CacheEntry { value }))
}
