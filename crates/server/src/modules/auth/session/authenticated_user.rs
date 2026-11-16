use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;

use crate::app_state::AppState;
use crate::modules::auth::session::access_token::{
    AccessTokenClaims, TokenAudience, verify_access_token,
};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;

const BEARER_PREFIX: &str = "Bearer ";

/// A request with a valid API key and an access token issued by that same tenant.
pub struct AuthenticatedUser {
    pub tenant: TenantContext,
    pub claims: AccessTokenClaims,
}

impl FromRequestParts<AppState> for AuthenticatedUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let tenant = TenantContext::from_request_parts(parts, state).await?;
        let access_token = bearer_token(parts)?;
        let signing_keys = state
            .signing_keys
            .keys_for(tenant.tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let audience = TokenAudience {
            issuer: &state.settings.token_issuer,
            tenant_id: tenant.tenant_id,
        };
        let claims = verify_access_token(access_token, &signing_keys, &audience)
            .map_err(|_| ApiError::InvalidAccessToken)?;

        Ok(Self { tenant, claims })
    }
}

fn bearer_token(parts: &Parts) -> Result<&str, ApiError> {
    let headers = &parts.headers;
    let Some(header_value) = headers.get(AUTHORIZATION) else {
        return Err(ApiError::InvalidAccessToken);
    };
    let header_text = header_value
        .to_str()
        .map_err(|_| ApiError::InvalidAccessToken)?;
    let Some(token) = header_text.strip_prefix(BEARER_PREFIX) else {
        return Err(ApiError::InvalidAccessToken);
    };

    if token.trim().is_empty() {
        return Err(ApiError::InvalidAccessToken);
    }

    Ok(token.trim())
}
