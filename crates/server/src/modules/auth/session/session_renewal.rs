use sqlx::PgPool;
use uuid::Uuid;

use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::refresh_token_repository::{
    RefreshTokenStatus, consume_refresh_token, find_family_owner, revoke_token_family,
};
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, TokenSigning, issue_session};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::modules::tenants::settings::email_verification_policy::ensure_email_verified;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;

/// A refresh token presented for renewal, and where it came from.
pub struct Renewal<'a> {
    pub refresh_token: &'a str,
    pub origin: RequestOrigin,
}

/// Rotates a refresh token. The presented token is consumed first, so a refused renewal (e.g.
/// email verification now required) also ends that session.
pub async fn renew_session(
    (control_plane_pool, signing): (&PgPool, &TokenSigning<'_>),
    tenant: &TenantContext,
    renewal: Renewal<'_>,
) -> Result<SessionTokens, ApiError> {
    let (user, family) = consume_token(tenant, renewal).await?;
    // Sessions issued while the tenant allowed unverified users stop renewing once it does not.
    ensure_email_verified(control_plane_pool, tenant.tenant_id, user.email_verified_at).await?;
    let grant = SessionGrant { user, family };

    issue_session(signing, tenant, grant).await
}

/// The user and session family of a refresh token that was still valid.
async fn consume_token(
    tenant: &TenantContext,
    renewal: Renewal<'_>,
) -> Result<(User, SessionFamily), ApiError> {
    let token_hash = hash_opaque_token(renewal.refresh_token.trim());

    match consume_refresh_token(&tenant.pool, &token_hash).await? {
        RefreshTokenStatus::Consumed { user, family } => Ok((*user, family)),
        RefreshTokenStatus::Reused { family_id } => {
            Err(revoke_reused_family(tenant, (family_id, renewal.origin)).await)
        }
        RefreshTokenStatus::Invalid => Err(ApiError::from(AuthRejection::InvalidRefreshToken)),
    }
}

/// A rotated token came back: either the client retried or the token was stolen.
/// We cannot tell which, so the whole session is revoked and the user must log in again.
async fn revoke_reused_family(
    tenant: &TenantContext,
    (family_id, origin): (Uuid, RequestOrigin),
) -> ApiError {
    tracing::warn!(tenant_id = %tenant.tenant_id, %family_id, "refresh token reuse detected");

    if let Err(error) = revoke_token_family(&tenant.pool, family_id).await {
        return ApiError::internal(error);
    }

    record_reuse(tenant, family_id, origin).await;
    ApiError::from(AuthRejection::InvalidRefreshToken)
}

/// The activity log shows the reuse on the owner's page; the IP is whoever sent the old token.
async fn record_reuse(tenant: &TenantContext, family_id: Uuid, origin: RequestOrigin) {
    let owner = match find_family_owner(&tenant.pool, family_id).await {
        Ok(Some(user_id)) => user_id,
        Ok(None) => return,
        Err(error) => {
            tracing::error!(%error, "could not find who a reused refresh token belonged to");
            return;
        }
    };
    let event = NewAuditEvent::by_user(AuditAction::RefreshTokenReused, owner, origin);

    record_audit_event(&tenant.pool, event).await;
}
