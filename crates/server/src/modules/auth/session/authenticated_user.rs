use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use crate::app_state::AppState;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::signing_keys::access_token::{AccessTokenClaims, TokenAudience};
use crate::modules::tenants::signing_keys::access_token_verification::verify_tenant_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;

/// A request with a valid API key and an access token issued by that same tenant.
pub struct AuthenticatedUser {
    pub tenant: TenantContext,
    pub claims: AccessTokenClaims,
}

impl FromRequestParts<AppState> for AuthenticatedUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let tenant = TenantContext::from_request_parts(parts, state).await?;
        let access_token = bearer_token(parts).ok_or(TenantsRejection::InvalidAccessToken)?;
        let audience = TokenAudience {
            issuer: &state.settings.token_issuer,
            tenant_id: tenant.tenant_id,
        };
        let claims = verify_tenant_token(&state.signing_keys, &audience, access_token).await?;

        Ok(Self { tenant, claims })
    }
}
