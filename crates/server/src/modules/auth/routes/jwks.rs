use axum::Json;
use axum::extract::State;
use jsonwebtoken::jwk::JwkSet;

use crate::app_state::AppState;
use crate::modules::tenants::access::api_key_tenant::ApiKeyTenant;
use crate::shared::http::api_error::ApiError;

/// Public keys of the tenant, so other services can verify access tokens without calling us.
pub async fn jwks(
    State(state): State<AppState>,
    tenant: ApiKeyTenant,
) -> Result<Json<JwkSet>, ApiError> {
    let signing_keys = state
        .signing_keys
        .keys_for(tenant.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let keys = signing_keys
        .verifying
        .iter()
        .map(|signing_key| signing_key.public_jwk())
        .collect::<Result<Vec<_>, _>>()
        .map_err(ApiError::internal)?;

    Ok(Json(JwkSet { keys }))
}
