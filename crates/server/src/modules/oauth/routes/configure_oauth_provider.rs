use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::provider::oauth_provider_repository::{
    ProviderRegistration, upsert_provider_credentials,
};
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct ProviderCredentialsBody {
    #[validate(length(min = 1, max = 512))]
    pub client_id: String,
    #[validate(length(min = 1, max = 512))]
    pub client_secret: String,
}

/// `PUT /admin/oauth/{provider}`: the tenant registers its own OAuth app (secret key only).
pub async fn configure_oauth_provider(
    State(state): State<AppState>,
    tenant: TenantContext,
    Path(provider_name): Path<String>,
    ValidatedJson(body): ValidatedJson<ProviderCredentialsBody>,
) -> Result<StatusCode, ApiError> {
    tenant.require_secret_key()?;
    let Some(provider) = OAuthProvider::parse(&provider_name) else {
        return Err(ApiError::UnknownOAuthProvider);
    };
    let client_id = body.client_id.trim();
    let client_secret = body.client_secret.trim();

    // The length check accepts whitespace-only values, which would be stored as empty strings.
    if client_id.is_empty() || client_secret.is_empty() {
        return Err(ApiError::InvalidRequest(
            "client_id and client_secret must not be blank".to_owned(),
        ));
    }

    let client_secret_ciphertext = state
        .secret_box
        .seal(client_secret.as_bytes())
        .map_err(ApiError::internal)?;
    let registration = ProviderRegistration {
        tenant_id: tenant.tenant_id,
        provider,
        client_id,
        client_secret_ciphertext: &client_secret_ciphertext,
    };
    upsert_provider_credentials(&state.control_plane_pool, registration)
        .await
        .map_err(ApiError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}
