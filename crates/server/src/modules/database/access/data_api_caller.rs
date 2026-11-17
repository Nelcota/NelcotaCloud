use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::database::access::request_role::RequestRole;
use crate::modules::tenants::access::api_key_tenant::{API_KEY_HEADER, ApiKeyTenant};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::signing_keys::access_token::TokenAudience;
use crate::modules::tenants::signing_keys::access_token_verification::verify_tenant_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;
use crate::shared::http::client_ip::ClientIp;

/// Who is calling the Data API: the project (always from the credentials, never from the
/// client), the role its statements run as and the claims its policies see.
pub struct DataApiCaller {
    pub tenant_id: Uuid,
    pub role: RequestRole,
    /// Readable in SQL with `auth.jwt()`.
    pub claims: Value,
}

impl FromRequestParts<AppState> for DataApiCaller {
    type Rejection = ApiError;

    /// With an API key: the secret key is the service role; the publishable key is a user when
    /// a valid access token comes with it, anonymous otherwise, and is rate limited per client. Without one: a console account
    /// managing the project (`x-nelcota-project`), as the service role.
    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        if parts.headers.contains_key(API_KEY_HEADER) == false {
            let admin = TenantAdmin::from_request_parts(parts, state).await?;
            return Ok(Self::service(admin.tenant_id));
        }

        let tenant = ApiKeyTenant::from_request_parts(parts, state).await?;
        let tenant_id = tenant.tenant_id;

        if tenant.api_key_kind == ApiKeyKind::Secret {
            return Ok(Self::service(tenant_id));
        }

        let ClientIp(client_ip) = ClientIp::from_request_parts(parts, state).await?;
        state
            .rate_limits
            .data_api
            .check(tenant_id, client_ip)
            .map_err(|_| ApiError::RateLimited)?;

        let Some(access_token) = bearer_token(parts) else {
            return Ok(Self::anonymous(tenant_id));
        };

        Self::user(state, tenant_id, access_token).await
    }
}

impl DataApiCaller {
    fn service(tenant_id: Uuid) -> Self {
        let role = RequestRole::Service;

        Self {
            tenant_id,
            role,
            claims: json!({ "role": role.claim() }),
        }
    }

    fn anonymous(tenant_id: Uuid) -> Self {
        let role = RequestRole::Anon;

        Self {
            tenant_id,
            role,
            claims: json!({ "role": role.claim() }),
        }
    }

    async fn user(state: &AppState, tenant_id: Uuid, access_token: &str) -> Result<Self, ApiError> {
        let audience = TokenAudience {
            issuer: &state.settings.token_issuer,
            tenant_id,
        };
        let token_claims =
            verify_tenant_token(&state.signing_keys, &audience, access_token).await?;
        let role = RequestRole::Authenticated;
        let mut claims = serde_json::to_value(token_claims).map_err(ApiError::internal)?;

        if let Some(object) = claims.as_object_mut() {
            object.insert("role".to_owned(), Value::from(role.claim()));
        }

        Ok(Self {
            tenant_id,
            role,
            claims,
        })
    }
}
