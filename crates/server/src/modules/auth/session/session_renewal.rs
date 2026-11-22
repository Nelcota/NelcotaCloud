use sqlx::PgPool;

use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::refresh_token_repository::{
    RefreshTokenStatus, consume_refresh_token, lock_refresh_owner, revoke_token_family_with,
};
use crate::modules::auth::session::session_grant::{
    SessionGrant, SessionRequest, TokenSigning, issue_session_with,
};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::insert_audit_event;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::settings::email_verification_policy::requires_email_verification;
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;

/// A refresh token presented for renewal, and where it came from.
pub struct Renewal<'a> {
    pub refresh_token: &'a str,
    pub origin: RequestOrigin,
}

/// The rotation commits with its successor. A policy refusal closes the session, while a
/// transient failure rolls back the old token's consumption.
pub async fn renew_session(
    (control_plane_pool, signing): (&PgPool, &TokenSigning<'_>),
    tenant: &TenantContext,
    renewal: Renewal<'_>,
) -> Result<SessionTokens, ApiError> {
    let token_hash = hash_opaque_token(renewal.refresh_token.trim());
    let mut transaction = tenant.pool.begin().await?;
    let owner = lock_refresh_owner(&mut transaction, &token_hash)
        .await?
        .ok_or(AuthRejection::InvalidRefreshToken)?;
    let status = consume_refresh_token(&mut transaction, &token_hash).await?;

    let (user, family) = match status {
        RefreshTokenStatus::Consumed { user, family } => (*user, family),
        RefreshTokenStatus::Reused { family_id } => {
            tracing::warn!(tenant_id = %tenant.tenant_id, %family_id, "refresh token reuse detected");
            revoke_token_family_with(&mut transaction, family_id).await?;
            let event =
                NewAuditEvent::by_user(AuditAction::RefreshTokenReused, owner, renewal.origin);
            insert_audit_event(&mut *transaction, event).await?;
            transaction.commit().await?;

            return Err(AuthRejection::InvalidRefreshToken.into());
        }
        RefreshTokenStatus::Invalid => return Err(AuthRejection::InvalidRefreshToken.into()),
    };

    if user.email_verified_at.is_none()
        && requires_email_verification(control_plane_pool, tenant.tenant_id).await?
    {
        revoke_token_family_with(&mut transaction, family.id).await?;
        transaction.commit().await?;

        return Err(TenantsRejection::EmailNotVerified.into());
    }

    let tokens = issue_session_with(
        signing,
        SessionRequest {
            tenant_id: tenant.tenant_id,
            connection: &mut transaction,
            grant: SessionGrant { user, family },
        },
    )
    .await?;
    transaction.commit().await?;

    Ok(tokens)
}
