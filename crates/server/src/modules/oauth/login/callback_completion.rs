use sqlx::PgPool;

use crate::modules::auth::integration::oauth_identity::{
    OneTimeTokenPurpose, OneTimeTokenRequest, issue_one_time_token,
};
use crate::modules::oauth::login::authorization_completion::ProviderCallback;
use crate::modules::oauth::login::oauth_login_context::OAuthLoginContext;
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::login::oauth_state_repository::{
    PendingAuthorization, take_pending_authorization,
};
use crate::modules::tenants::postgres::tenant_pool_registry::TenantPoolRegistry;
use crate::modules::webhooks::runtime::webhook_runtime::WebhookRuntime;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;

const MAX_STATE_LENGTH: usize = 256;

/// Without a valid state we do not know which app to return to, so this answers with an error.
pub async fn take_pending(
    control_plane_pool: &PgPool,
    raw_state: Option<String>,
) -> Result<PendingAuthorization, ApiError> {
    let raw_state =
        raw_state.ok_or_else(|| ApiError::InvalidRequest("missing state".to_owned()))?;

    if raw_state.len() > MAX_STATE_LENGTH {
        return Err(ApiError::InvalidRequest("invalid state".to_owned()));
    }

    let state_hash = hash_opaque_token(&raw_state);
    let pending = take_pending_authorization(control_plane_pool, &state_hash)
        .await
        .map_err(ApiError::internal)?;
    let pending = pending
        .ok_or_else(|| ApiError::InvalidRequest("unknown or expired OAuth state".to_owned()))?;

    Ok(pending)
}

/// Finishes the login at the provider and issues the one-time code the app redeems with its
/// PKCE verifier.
pub async fn issue_login_code(
    services: &CallbackServices<'_>,
    pending: &PendingAuthorization,
    code: Option<String>,
) -> Result<String, OAuthLoginError> {
    let tenant_pool = services.tenant_pools.pool_for(pending.tenant_id).await?;
    // A blank code is no code: treat it as the user denying access, not as a server error.
    let code = code.filter(|code| code.trim().is_empty() == false);
    let webhooks = services.webhooks.recorder(pending.tenant_id).await?;
    let callback = ProviderCallback {
        pending,
        tenant_pool: &tenant_pool,
        code,
        webhooks: &webhooks,
    };
    let user = services.login.finish(callback).await?;
    let request = OneTimeTokenRequest {
        user_id: user.id,
        purpose: OneTimeTokenPurpose::OAuthLogin,
        code_challenge: Some(&pending.app_code_challenge),
    };

    Ok(issue_one_time_token(&tenant_pool, request).await?)
}
pub struct CallbackServices<'a> {
    pub tenant_pools: &'a TenantPoolRegistry,
    pub webhooks: &'a WebhookRuntime,
    pub login: OAuthLoginContext<'a>,
}
