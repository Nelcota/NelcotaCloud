use axum::extract::State;
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::cache::access::CacheAccess;
use crate::modules::cache::entries::cache_payload::CacheWriteRequest;
use crate::modules::cache::rejection::CacheRejection;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

/// Writes a JSON value with mandatory expiration.
#[utoipa::path(
    post,
    path = "/cache/v1/set",
    tag = "cache",
    security(("cache_credential" = [])),
    request_body = CacheWriteRequest,
    responses(
        (status = 204, description = "Cache entry written"),
        (status = 400, description = "Invalid cache request", body = ErrorBody),
        (status = 401, description = "Invalid cache credential", body = ErrorBody),
        (status = 409, description = "Project cache is disabled", body = ErrorBody),
        (status = 413, description = "Cache payload is too large", body = ErrorBody),
        (status = 429, description = "Project quota reached", body = ErrorBody),
        (status = 503, description = "Cache is unavailable", body = ErrorBody),
    )
)]
pub async fn set_cache_entry(
    State(state): State<AppState>,
    access: CacheAccess,
    ValidatedJson(request): ValidatedJson<CacheWriteRequest>,
) -> Result<StatusCode, ApiError> {
    let store = state
        .cache_store
        .as_ref()
        .ok_or(CacheRejection::Unavailable)?;
    let key = access.entry_key(&request.key);
    let value = request.encode_value()?;
    store.set(&key, &value, request.ttl_seconds()).await?;

    Ok(StatusCode::NO_CONTENT)
}
