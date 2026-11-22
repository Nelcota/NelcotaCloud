use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use super::storage_caller::StorageCaller;
use crate::app_state::AppState;
use crate::modules::auth::integration::session_token::verify_session_token;
use crate::modules::tenants::access::api_key_tenant::{API_KEY_HEADER, ApiKeyTenant};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;

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

        let token = bearer_token(parts).ok_or(TenantsRejection::InvalidAccessToken)?;
        let (claims, _) = verify_session_token(state, tenant.tenant_id, token).await?;

        Ok(Self {
            tenant_id: tenant.tenant_id,
            owner_id: Some(claims.sub),
        })
    }
}
