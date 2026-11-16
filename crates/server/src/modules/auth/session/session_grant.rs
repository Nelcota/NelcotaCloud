use sqlx::PgConnection;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_issuer::{SessionIssuer, SessionTokens};
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;

/// A user who just proved who they are, and the session family the new tokens belong to.
pub struct SessionGrant {
    pub user: User,
    pub family: SessionFamily,
}

/// A session to issue on a connection the caller controls (e.g. inside its transaction).
pub struct SessionRequest<'a> {
    pub tenant_id: Uuid,
    pub connection: &'a mut PgConnection,
    pub grant: SessionGrant,
}

/// Signs with the tenant's active key and stores the refresh token in the tenant database.
pub async fn issue_session(
    state: &AppState,
    tenant: &TenantContext,
    grant: SessionGrant,
) -> Result<SessionTokens, ApiError> {
    let mut connection = tenant.pool.acquire().await.map_err(ApiError::internal)?;
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut connection,
        grant,
    };

    issue_session_with(state, request).await
}

pub async fn issue_session_with(
    state: &AppState,
    request: SessionRequest<'_>,
) -> Result<SessionTokens, ApiError> {
    let signing_keys = state
        .signing_keys
        .keys_for(request.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let issuer = SessionIssuer {
        tenant_id: request.tenant_id,
        issuer: &state.settings.token_issuer,
        signing_key: &signing_keys.active,
    };
    let grant = request.grant;

    issuer
        .issue(request.connection, grant.user, grant.family)
        .await
        .map_err(ApiError::internal)
}
