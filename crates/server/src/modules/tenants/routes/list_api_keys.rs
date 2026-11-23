use axum::Json;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue};
use serde::Deserialize;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::api_keys::api_key_repository::list_api_keys as find_api_keys;
use crate::modules::tenants::api_keys::api_key_summary::ApiKeySummary;
use crate::shared::http::api_error::{ApiError, ErrorBody};

pub const NEXT_API_KEY_CURSOR: HeaderName = HeaderName::from_static("x-nelcota-next-cursor");

#[derive(Deserialize)]
pub struct ApiKeyListQuery {
    before: Option<Uuid>,
}

/// `GET /admin/api-keys`: active keys and the first page of revoked keys, newest first.
/// Pass the response cursor as `before` for the next page of revoked keys.
#[utoipa::path(
    get,
    path = "/auth/v1/admin/api-keys",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("before" = Option<Uuid>, Query, description = "Cursor for the next page of revoked keys")),
    responses(
        (status = 200, description = "The tenant's API keys", body = Vec<ApiKeySummary>,
         headers(("X-Nelcota-Next-Cursor" = String, description = "Cursor when more revoked keys exist"))),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
    )
)]
pub async fn list_api_keys(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Query(query): Query<ApiKeyListQuery>,
) -> Result<(HeaderMap, Json<Vec<ApiKeySummary>>), ApiError> {
    let (keys, next) =
        find_api_keys(&state.control_plane_pool, admin.tenant_id, query.before).await?;
    let mut headers = HeaderMap::new();

    if let Some(next) = next {
        let value = HeaderValue::from_str(&next.to_string()).map_err(ApiError::internal)?;
        headers.insert(NEXT_API_KEY_CURSOR, value);
    }

    Ok((headers, Json(keys)))
}
