use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::signing_keys::access_token::{
    AccessTokenClaims, TokenAudience, verify_access_token,
};
use crate::modules::tenants::signing_keys::signing_key_cache::SigningKeyCache;
use crate::shared::http::api_error::ApiError;

/// Verifies an access token against the keys of the tenant it must have been issued by.
pub async fn verify_tenant_token(
    signing_keys: &SigningKeyCache,
    audience: &TokenAudience<'_>,
    access_token: &str,
) -> Result<AccessTokenClaims, ApiError> {
    let tenant_keys = signing_keys
        .keys_for(audience.tenant_id)
        .await
        .map_err(ApiError::internal)?;

    verify_access_token(access_token, &tenant_keys, audience)
        .map_err(|_| ApiError::from(TenantsRejection::InvalidAccessToken))
}
