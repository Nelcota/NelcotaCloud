use axum::body::Bytes;
use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderName, HeaderValue};

use crate::app_state::AppState;
use crate::modules::tenants::access::api_key_tenant::ApiKeyTenant;
use crate::shared::http::api_error::ApiError;

const JSON_CONTENT_TYPE: HeaderValue = HeaderValue::from_static("application/json");

/// Public keys of the tenant, so other services can verify access tokens without calling us.
/// The document is serialized once per key set and shared by every response.
#[utoipa::path(
    get,
    path = "/auth/v1/jwks",
    tag = "auth",
    security(("api_key" = [])),
    responses(
        (status = 200, description = "The tenant's public keys (JWKS) to verify access tokens", body = Object),
    )
)]
pub async fn jwks(
    State(state): State<AppState>,
    tenant: ApiKeyTenant,
) -> Result<([(HeaderName, HeaderValue); 1], Bytes), ApiError> {
    let signing_keys = state
        .signing_keys
        .keys_for(tenant.tenant_id)
        .await
        .map_err(ApiError::internal)?;

    Ok((
        [(CONTENT_TYPE, JSON_CONTENT_TYPE)],
        signing_keys.jwks_json().map_err(ApiError::internal)?,
    ))
}
