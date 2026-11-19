use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::integration::storage_access::require_active_user;
use crate::modules::tenants::access::api_key_tenant::{API_KEY_HEADER, ApiKeyTenant};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::signing_keys::access_token::TokenAudience;
use crate::modules::tenants::signing_keys::access_token_verification::verify_tenant_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;

#[derive(Clone, Copy)]
pub struct StorageCaller {
    pub tenant_id: Uuid,
    pub owner_id: Option<Uuid>,
}

impl FromRequestParts<AppState> for StorageCaller {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        if parts.headers.contains_key(API_KEY_HEADER) == false {
            let admin = TenantAdmin::from_request_parts(parts, state).await?;
            return Ok(Self {
                tenant_id: admin.tenant_id,
                owner_id: None,
            });
        }

        let tenant = ApiKeyTenant::from_request_parts(parts, state).await?;
        if tenant.api_key_kind == ApiKeyKind::Secret {
            return Ok(Self {
                tenant_id: tenant.tenant_id,
                owner_id: None,
            });
        }

        let user_id = user_id(parts, state, tenant.tenant_id).await?;
        let pool = state
            .tenant_pools
            .pool_for(tenant.tenant_id)
            .await
            .map_err(ApiError::internal)?;
        require_active_user(&pool, user_id).await?;

        Ok(Self {
            tenant_id: tenant.tenant_id,
            owner_id: Some(user_id),
        })
    }
}

async fn user_id(parts: &Parts, state: &AppState, tenant_id: Uuid) -> Result<Uuid, ApiError> {
    let access_token = bearer_token(parts).ok_or(TenantsRejection::InvalidAccessToken)?;
    let audience = TokenAudience {
        issuer: &state.settings.token_issuer,
        tenant_id,
    };
    let claims = verify_tenant_token(&state.signing_keys, &audience, access_token).await?;

    Ok(claims.sub)
}
