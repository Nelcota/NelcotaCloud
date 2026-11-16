use uuid::Uuid;

use crate::app_state::AppState;
use crate::auth::session_issuer::{SessionIssuer, SessionTokens};
use crate::auth::user_repository::User;
use crate::http::api_error::ApiError;
use crate::http::tenant_context::TenantContext;

/// A user who just proved who they are, and the session family the new tokens belong to.
pub struct SessionGrant {
    pub user: User,
    pub family_id: Uuid,
}

pub async fn issue_session(
    state: &AppState,
    tenant: &TenantContext,
    grant: SessionGrant,
) -> Result<SessionTokens, ApiError> {
    let signing_keys = state
        .signing_keys
        .keys_for(tenant.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(active_signing_key) = signing_keys.first() else {
        return Err(ApiError::internal(format!(
            "tenant {} has no signing key",
            tenant.tenant_id
        )));
    };
    let issuer = SessionIssuer {
        tenant_id: tenant.tenant_id,
        issuer: &state.settings.token_issuer,
        signing_key: active_signing_key,
        tenant_pool: &tenant.pool,
    };

    issuer
        .issue(grant.user, grant.family_id)
        .await
        .map_err(ApiError::internal)
}
