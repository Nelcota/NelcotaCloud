use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_issuer::{SessionIssuer, SessionTokens};
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::signing_keys::signing_key_cache::SigningKeyCache;
use crate::shared::http::api_error::ApiError;

/// A user who just proved who they are, and the session family the new tokens belong to.
pub struct SessionGrant {
    pub user: User,
    pub family: SessionFamily,
}

/// What access tokens are signed with: each tenant's keys and this API's issuer name.
pub struct TokenSigning<'a> {
    pub signing_keys: &'a SigningKeyCache,
    pub issuer: &'a str,
}

/// A session to issue on a connection the caller controls (e.g. inside its transaction).
pub struct SessionRequest<'a> {
    pub tenant_id: Uuid,
    pub connection: &'a mut PgConnection,
    pub grant: SessionGrant,
}

/// Signs with the tenant's active key and stores the refresh token in the tenant database.
pub async fn issue_session(
    signing: &TokenSigning<'_>,
    tenant: &TenantContext,
    grant: SessionGrant,
) -> Result<SessionTokens, ApiError> {
    let mut connection = tenant.pool.acquire().await?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut connection,
        grant,
    };

    issue_session_with(signing, request).await
}

/// Every way to obtain tokens (login, signup, refresh, OAuth, magic link) ends here, so a ban
/// is enforced in one place.
pub async fn issue_session_with(
    signing: &TokenSigning<'_>,
    request: SessionRequest<'_>,
) -> Result<SessionTokens, ApiError> {
    if request.grant.user.banned_at.is_some() {
        return Err(ApiError::from(TenantsRejection::UserBanned));
    }

    let signing_keys = signing
        .signing_keys
        .keys_for(request.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let issuer = SessionIssuer {
        tenant_id: request.tenant_id,
        issuer: signing.issuer,
        signing_key: &signing_keys.active,
    };
    let grant = request.grant;

    issuer
        .issue(request.connection, grant.user, grant.family)
        .await
        .map_err(ApiError::internal)
}
