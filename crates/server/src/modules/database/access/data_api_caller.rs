use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use serde::Serialize;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::integration::session_token::verify_session_token;
use crate::modules::database::access::request_role::RequestRole;
use crate::modules::database::usage::usage_slot::{UsageSlot, UsageTarget};
use crate::modules::tenants::access::api_key_tenant::{API_KEY_HEADER, ApiKeyTenant};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::signing_keys::access_token::AccessTokenClaims;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;
use crate::shared::http::client_ip::ClientIp;

/// Who is calling the Data API: the project (always from the credentials, never from the
/// client), the role its statements run as and the claims its policies see.
pub struct DataApiCaller {
    pub tenant_id: Uuid,
    pub role: RequestRole,
    /// Readable in SQL with `auth.jwt()`, as the JSON text bound into the transaction.
    pub claims: String,
}

const ANON_CLAIMS: &str = r#"{"role":"anon"}"#;
const SERVICE_CLAIMS: &str = r#"{"role":"service"}"#;

/// A user's verified token claims plus the role, serialized in one pass.
#[derive(Serialize)]
struct UserClaims<'a> {
    #[serde(flatten)]
    token: &'a AccessTokenClaims,
    role: &'static str,
}

impl FromRequestParts<AppState> for DataApiCaller {
    type Rejection = ApiError;

    /// With an API key: the secret key is the service role; the publishable key is a user when
    /// a valid access token comes with it, anonymous otherwise, and is rate limited per client. Without one: a console account
    /// managing the project (`x-nelcota-project`), as the service role.
    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        if parts.headers.contains_key(API_KEY_HEADER) == false {
            let admin = TenantAdmin::from_request_parts(parts, state).await?;
            count_usage_for(parts, state, admin.tenant_id);
            return Self::service(state, admin.tenant_id);
        }

        let tenant = ApiKeyTenant::from_request_parts(parts, state).await?;
        let tenant_id = tenant.tenant_id;
        count_usage_for(parts, state, tenant_id);

        if tenant.api_key_kind == ApiKeyKind::Secret {
            return Self::service(state, tenant_id);
        }

        let ClientIp(client_ip) = ClientIp::from_request_parts(parts, state).await?;
        state
            .rate_limits
            .data_api_per_client_ip
            .check(tenant_id, client_ip)
            .map_err(ApiError::from)?;

        let access_token = match bearer_token(parts) {
            Some(access_token) => access_token,
            None => return Ok(Self::anonymous(tenant_id)),
        };

        Self::user(state, tenant_id, access_token).await
    }
}

/// From here on the response counts in the project's Data API usage, refusals included.
fn count_usage_for(parts: &Parts, state: &AppState, tenant_id: Uuid) {
    let Some(slot) = parts.extensions.get::<UsageSlot>() else {
        return;
    };

    slot.fill(UsageTarget {
        tenant_id,
        buffer: state.data_api_usage.clone(),
    });
}

impl DataApiCaller {
    /// The project's own servers and the console, limited per project (not per client).
    fn service(state: &AppState, tenant_id: Uuid) -> Result<Self, ApiError> {
        state
            .rate_limits
            .data_api_per_project
            .check(tenant_id, Uuid::nil())?;

        Ok(Self {
            tenant_id,
            role: RequestRole::Service,
            claims: SERVICE_CLAIMS.to_owned(),
        })
    }

    fn anonymous(tenant_id: Uuid) -> Self {
        Self {
            tenant_id,
            role: RequestRole::Anon,
            claims: ANON_CLAIMS.to_owned(),
        }
    }

    async fn user(state: &AppState, tenant_id: Uuid, access_token: &str) -> Result<Self, ApiError> {
        let (token_claims, _) = verify_session_token(state, tenant_id, access_token).await?;
        let role = RequestRole::Authenticated;
        let user_claims = UserClaims {
            token: &token_claims,
            role: role.claim(),
        };
        let claims = serde_json::to_string(&user_claims).map_err(ApiError::internal)?;

        Ok(Self {
            tenant_id,
            role,
            claims,
        })
    }
}
