use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::refresh_token_repository::{
    RefreshTokenStatus, consume_refresh_token, revoke_token_family,
};
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, issue_session};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::settings::email_verification_policy::ensure_email_verified;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;

/// Rotates a refresh token. The presented token is consumed first, so a refused renewal (e.g.
/// email verification now required) also ends that session.
pub async fn renew_session(
    state: &AppState,
    tenant: &TenantContext,
    refresh_token: &str,
) -> Result<SessionTokens, ApiError> {
    let (user_id, family) = consume_token(tenant, refresh_token).await?;
    let user = find_user_by_id(&tenant.pool, user_id).await?;
    let Some(user) = user else {
        return Err(ApiError::from(AuthRejection::InvalidRefreshToken));
    };
    // Sessions issued while the tenant allowed unverified users stop renewing once it does not.
    let pool = &state.control_plane_pool;
    ensure_email_verified(pool, tenant.tenant_id, user.email_verified_at).await?;
    let grant = SessionGrant { user, family };

    issue_session(&state.token_signing(), tenant, grant).await
}

/// The user and session family of a refresh token that was still valid.
async fn consume_token(
    tenant: &TenantContext,
    refresh_token: &str,
) -> Result<(Uuid, SessionFamily), ApiError> {
    let token_hash = hash_opaque_token(refresh_token.trim());

    match consume_refresh_token(&tenant.pool, &token_hash).await? {
        RefreshTokenStatus::Consumed { user_id, family } => Ok((user_id, family)),
        RefreshTokenStatus::Reused { family_id } => {
            Err(revoke_reused_family(tenant, family_id).await)
        }
        RefreshTokenStatus::Invalid => Err(ApiError::from(AuthRejection::InvalidRefreshToken)),
    }
}

/// A rotated token came back: either the client retried or the token was stolen.
/// We cannot tell which, so the whole session is revoked and the user must log in again.
async fn revoke_reused_family(tenant: &TenantContext, family_id: Uuid) -> ApiError {
    tracing::warn!(tenant_id = %tenant.tenant_id, %family_id, "refresh token reuse detected");

    if let Err(error) = revoke_token_family(&tenant.pool, family_id).await {
        return ApiError::internal(error);
    }

    ApiError::from(AuthRejection::InvalidRefreshToken)
}
