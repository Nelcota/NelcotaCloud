use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use sqlx::PgPool;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::control_plane::api_key_kind::ApiKeyKind;
use crate::control_plane::api_key_repository::find_active_api_key_owner;
use crate::crypto::opaque_token::hash_opaque_token;
use crate::http::api_error::ApiError;

pub const API_KEY_HEADER: &str = "apikey";

/// The tenant behind the request, resolved only from the API key, never from client-sent ids.
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub api_key_kind: ApiKeyKind,
    pub pool: PgPool,
}

impl FromRequestParts<AppState> for TenantContext {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let headers = &parts.headers;
        let Some(header_value) = headers.get(API_KEY_HEADER) else {
            return Err(ApiError::MissingApiKey);
        };
        let api_key = header_value.to_str().map_err(|_| ApiError::InvalidApiKey)?;

        Self::resolve(state, api_key).await
    }
}

impl TenantContext {
    /// For endpoints that change the tenant's own configuration.
    pub fn require_secret_key(&self) -> Result<(), ApiError> {
        if self.api_key_kind != ApiKeyKind::Secret {
            return Err(ApiError::SecretKeyRequired);
        }

        Ok(())
    }

    /// Also used directly by routes reached through browser redirects, which cannot send headers.
    pub async fn resolve(state: &AppState, api_key: &str) -> Result<Self, ApiError> {
        let key_hash = hash_opaque_token(api_key.trim());
        let owner = find_active_api_key_owner(&state.control_plane_pool, &key_hash)
            .await
            .map_err(ApiError::internal)?;
        let Some(owner) = owner else {
            return Err(ApiError::InvalidApiKey);
        };
        let pool = state
            .tenant_pools
            .pool_for(owner.tenant_id)
            .await
            .map_err(ApiError::internal)?;

        Ok(Self {
            tenant_id: owner.tenant_id,
            api_key_kind: owner.kind,
            pool,
        })
    }
}
