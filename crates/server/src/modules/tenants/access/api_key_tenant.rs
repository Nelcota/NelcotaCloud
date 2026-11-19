use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::api_keys::api_key_repository::find_active_api_key;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
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
        let header_value = headers
            .get(API_KEY_HEADER)
            .ok_or(TenantsRejection::MissingApiKey)?;
        let api_key = header_value
            .to_str()
            .map_err(|_| ApiError::from(TenantsRejection::InvalidApiKey))?;

        Self::resolve(state, api_key).await
    }
}

impl ApiKeyTenant {
    /// Also used directly by routes reached through browser redirects, which cannot send headers.
    pub async fn resolve(state: &AppState, api_key: &str) -> Result<Self, ApiError> {
        let key_hash = hash_opaque_token(api_key.trim());
        let active_key = find_active_api_key(&state.control_plane_pool, &key_hash)
            .await
            .map_err(ApiError::internal)?;
        let active_key = active_key.ok_or(TenantsRejection::InvalidApiKey)?;
        let owner = active_key.owner;
        record_tenant(owner.tenant_id);
        state.api_key_usage.note_use(active_key.id).await;

        Ok(Self {
            tenant_id: owner.tenant_id,
            api_key_kind: owner.kind,
        })
    }

    /// For keys sent in a URL (avatar links, OAuth start): URLs end up in logs and browser
    /// history, so a secret key must never travel in one.
    pub async fn resolve_publishable(state: &AppState, api_key: &str) -> Result<Self, ApiError> {
        let tenant = Self::resolve(state, api_key).await?;

        if tenant.api_key_kind != ApiKeyKind::Publishable {
            return Err(ApiError::invalid_request(
                "use the publishable key in URLs, never the secret key",
            ));
        }

        Ok(tenant)
    }

    /// For endpoints that change the tenant's own configuration.
    pub fn require_secret_key(&self) -> Result<(), ApiError> {
        if self.api_key_kind != ApiKeyKind::Secret {
            return Err(ApiError::from(TenantsRejection::SecretKeyRequired));
        }

        Ok(())
    }
}
