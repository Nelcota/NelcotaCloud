use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::platform::platform_tenant::find_platform_tenant_id;
use crate::modules::tenants::signing_keys::access_token::{TokenAudience, verify_access_token};
use crate::shared::http::api_error::ApiError;

const BEARER_SCHEME: &str = "Bearer";

/// Someone logged into the console: a user of the platform tenant, proven by their access
/// token, which must have been issued by the platform tenant itself.
pub struct PlatformAccount {
    pub account_id: Uuid,
    pub email: String,
}

impl FromRequestParts<AppState> for PlatformAccount {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let Some(access_token) = bearer_token(parts) else {
            return Err(ApiError::InvalidAccessToken);
        };

        verify_platform_token(state, access_token).await
    }
}

pub async fn verify_platform_token(
    state: &AppState,
    access_token: &str,
) -> Result<PlatformAccount, ApiError> {
    let platform_tenant_id = find_platform_tenant_id(state).await?;
    let signing_keys = state
        .signing_keys
        .keys_for(platform_tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let audience = TokenAudience {
        issuer: &state.settings.token_issuer,
        tenant_id: platform_tenant_id,
    };
    let claims = verify_access_token(access_token, &signing_keys, &audience)
        .map_err(|_| ApiError::InvalidAccessToken)?;

    let tenant_pool = state
        .tenant_pools
        .pool_for(platform_tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let account =
        crate::modules::auth::user::user_lookup::find_user_by_id(&tenant_pool, claims.sub)
            .await
            .map_err(ApiError::internal)?;
    let Some(account) = account else {
        return Err(ApiError::InvalidAccessToken);
    };

    if account.email_verified_at.is_none() || account.banned_at.is_some() {
        return Err(ApiError::InvalidAccessToken);
    }

    Ok(PlatformAccount {
        account_id: claims.sub,
        email: account.email,
    })
}

/// `Bearer <token>`, case-insensitive scheme; `None` when absent or blank.
pub fn bearer_token(parts: &Parts) -> Option<&str> {
    let header_text = parts.headers.get(AUTHORIZATION)?.to_str().ok()?;
    let (scheme, token) = header_text.trim().split_once(' ')?;
    let token = token.trim();

    if scheme.eq_ignore_ascii_case(BEARER_SCHEME) == false || token.is_empty() {
        return None;
    }

    Some(token)
}
