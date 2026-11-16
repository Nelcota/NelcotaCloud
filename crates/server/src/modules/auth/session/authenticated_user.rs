use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;

use crate::app_state::AppState;
use crate::modules::auth::session::access_token::{
    AccessTokenClaims, TokenAudience, verify_access_token,
};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;

const BEARER_SCHEME: &str = "Bearer";

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
    let Some(token) = parse_bearer_token(header_text) else {
        return Err(ApiError::InvalidAccessToken);
    };

    Ok(token)
}

/// `Bearer <token>`. The scheme is case-insensitive (RFC 7235); a blank token is no token.
fn parse_bearer_token(header_text: &str) -> Option<&str> {
    let (scheme, token) = header_text.trim().split_once(' ')?;
    let token = token.trim();

    if scheme.eq_ignore_ascii_case(BEARER_SCHEME) == false || token.is_empty() {
        return None;
    }

    Some(token)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_any_scheme_case() {
        for header in ["Bearer abc", "bearer abc", "BEARER  abc ", "  Bearer abc"] {
            assert_eq!(parse_bearer_token(header), Some("abc"));
        }
    }

    #[test]
    fn rejects_other_schemes_and_blank_tokens() {
        for header in [
            "",
            "Bearer",
            "Bearer ",
            "Bearer    ",
            "Basic abc",
            "Bearerabc",
            "abc",
        ] {
            assert_eq!(parse_bearer_token(header), None);
        }
    }
}
