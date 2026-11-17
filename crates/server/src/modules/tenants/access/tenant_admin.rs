use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::access::api_key_tenant::{API_KEY_HEADER, ApiKeyTenant};
use crate::modules::tenants::platform::platform_account::verify_platform_token;
use crate::modules::tenants::platform::project_access::role_in_project;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;
use crate::shared::http::request_span::record_tenant;

/// Names the project a console request manages, next to the account's access token.
pub const PROJECT_HEADER: &str = "x-nelcota-project";

/// Someone allowed to manage a tenant: a server holding its secret API key, or a platform
/// account (console) that is a member of the project named in `x-nelcota-project`.
///
/// The project id comes from the client, so membership is checked on every request.
pub struct TenantAdmin {
    pub tenant_id: Uuid,
}

impl FromRequestParts<AppState> for TenantAdmin {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        if parts.headers.contains_key(API_KEY_HEADER) {
            return from_secret_key(parts, state).await;
        }

        let Some(access_token) = bearer_token(parts) else {
            return Err(ApiError::from(TenantsRejection::MissingApiKey));
        };
        let project_id = project_id(parts)?;
        let account = verify_platform_token(state, access_token).await?;
        role_in_project(&state.control_plane_pool, project_id, &account).await?;
        record_tenant(project_id);

        Ok(Self {
            tenant_id: project_id,
        })
    }
}

async fn from_secret_key(parts: &mut Parts, state: &AppState) -> Result<TenantAdmin, ApiError> {
    let tenant = ApiKeyTenant::from_request_parts(parts, state).await?;
    tenant.require_secret_key()?;

    Ok(TenantAdmin {
        tenant_id: tenant.tenant_id,
    })
}

fn project_id(parts: &Parts) -> Result<Uuid, ApiError> {
    let missing =
        || ApiError::InvalidRequest(format!("missing or invalid {PROJECT_HEADER} header"));
    let Some(header_value) = parts.headers.get(PROJECT_HEADER) else {
        return Err(missing());
    };
    let raw_id = header_value.to_str().map_err(|_| missing())?;

    Uuid::parse_str(raw_id.trim()).map_err(|_| missing())
}
