use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::session::session_access::{SessionAccount, require_active_session};
use crate::modules::tenants::signing_keys::access_token::{AccessTokenClaims, TokenAudience};
use crate::modules::tenants::signing_keys::access_token_verification::verify_tenant_token;
use crate::shared::http::api_error::ApiError;

/// Verifies the issuer and audience before opening the tenant's account database.
pub(crate) async fn verify_session_token(
    state: &AppState,
    tenant_id: Uuid,
    token: &str,
) -> Result<(AccessTokenClaims, SessionAccount), ApiError> {
    let audience = TokenAudience {
        issuer: &state.settings.token_issuer,
        tenant_id,
    };
    let claims = verify_tenant_token(&state.signing_keys, &audience, token).await?;
    let pool = state
        .tenant_pools
        .pool_for(tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let account = require_active_session(&pool, claims.sub, claims.sid).await?;

    Ok((claims, account))
}
