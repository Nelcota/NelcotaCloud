use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::api_keys::api_key_repository::find_active_api_key_owner;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_span::record_tenant;

pub const API_KEY_HEADER: &str = "apikey";

/// The tenant behind the API key, resolved only from the control plane. Routes that only touch
/// tenant configuration use it, so they keep working while the tenant's database is down.
pub struct ApiKeyTenant {
    pub tenant_id: Uuid,
    pub api_key_kind: ApiKeyKind,
}

impl FromRequestParts<AppState> for ApiKeyTenant {
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

impl ApiKeyTenant {
    /// Also used directly by routes reached through browser redirects, which cannot send headers.
    pub async fn resolve(state: &AppState, api_key: &str) -> Result<Self, ApiError> {
        let key_hash = hash_opaque_token(api_key.trim());
        let owner = find_active_api_key_owner(&state.control_plane_pool, &key_hash)
            .await
            .map_err(ApiError::internal)?;
        let Some(owner) = owner else {
            return Err(ApiError::InvalidApiKey);
        };
        record_tenant(owner.tenant_id);

        Ok(Self {
            tenant_id: owner.tenant_id,
            api_key_kind: owner.kind,
        })
    }

    /// For endpoints that change the tenant's own configuration.
    pub fn require_secret_key(&self) -> Result<(), ApiError> {
        if self.api_key_kind != ApiKeyKind::Secret {
            return Err(ApiError::SecretKeyRequired);
        }

        Ok(())
    }
}
