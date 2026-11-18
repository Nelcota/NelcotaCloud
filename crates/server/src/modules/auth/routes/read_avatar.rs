use axum::extract::{Path, Query, State};
use axum::http::HeaderValue;
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE, X_CONTENT_TYPE_OPTIONS};
use axum::response::{IntoResponse, Response};
use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::avatar::avatar_repository::find_avatar;
use crate::modules::auth::avatar::image_file::ImageFile;
use crate::modules::tenants::access::api_key_tenant::ApiKeyTenant;
use crate::shared::http::api_error::{ApiError, ErrorBody};

const AVATAR_CONTENT_TYPE: &str = "image/jpeg";
/// Clients add the photo's `version` to the URL, so a changed photo is a new URL; the hour only
/// bounds how long a removed photo may still be shown.
const AVATAR_CACHE_CONTROL: &str = "public, max-age=3600";
const CROSS_ORIGIN_RESOURCE_POLICY: &str = "cross-origin-resource-policy";
const ANY_ORIGIN_MAY_EMBED: &str = "cross-origin";
const NO_SNIFF: &str = "nosniff";

#[derive(Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct AvatarQuery {
    /// The publishable key travels in the query: the URL goes in an `<img src>`.
    #[validate(length(min = 1, max = 256))]
    pub apikey: String,
    /// The user's `avatar_updated_at`; any value works, it only changes the URL for caches.
    #[validate(length(max = 64))]
    pub version: Option<String>,
}

/// `GET /users/{user_id}/avatar`: a user's profile photo, public so apps can show it to others.
#[utoipa::path(
    get,
    path = "/auth/v1/users/{user_id}/avatar",
    tag = "auth",
    params(("user_id" = Uuid, Path, description = "Id of the user"), AvatarQuery),
    responses(
        (status = 200, description = "The photo, a square JPEG", content_type = "image/jpeg", body = ImageFile),
        (status = 400, description = "A secret key in the URL, or an invalid query", body = ErrorBody),
        (status = 401, description = "Invalid API key", body = ErrorBody),
        (status = 404, description = "The user has no photo", body = ErrorBody),
    )
)]
pub async fn read_avatar(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(query): Query<AvatarQuery>,
) -> Result<Response, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let tenant = ApiKeyTenant::resolve_publishable(&state, &query.apikey).await?;
    let pool = state
        .tenant_pools
        .pool_for(tenant.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let avatar = find_avatar(&pool, user_id).await?;
    let Some(avatar) = avatar else {
        return Err(ApiError::NotFound("avatar"));
    };

    Ok((avatar_headers(), avatar.image).into_response())
}

/// Replaces the headers the byte body would set (`application/octet-stream`).
fn avatar_headers() -> [(&'static str, HeaderValue); 4] {
    [
        (
            CONTENT_TYPE.as_str(),
            HeaderValue::from_static(AVATAR_CONTENT_TYPE),
        ),
        (
            CACHE_CONTROL.as_str(),
            HeaderValue::from_static(AVATAR_CACHE_CONTROL),
        ),
        (
            X_CONTENT_TYPE_OPTIONS.as_str(),
            HeaderValue::from_static(NO_SNIFF),
        ),
        // Apps with cross-origin isolation (COEP) may still embed the photo.
        (
            CROSS_ORIGIN_RESOURCE_POLICY,
            HeaderValue::from_static(ANY_ORIGIN_MAY_EMBED),
        ),
    ]
}
