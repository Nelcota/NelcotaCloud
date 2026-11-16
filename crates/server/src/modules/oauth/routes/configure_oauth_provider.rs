use crate::shared::http::api_error::ErrorBody;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::provider::oauth_provider_repository::{
    ProviderKey, ProviderRegistration, client_secret_context, upsert_provider_credentials,
};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct ProviderCredentialsBody {
    #[validate(length(min = 1, max = 512))]
    pub client_id: String,
    #[validate(length(min = 1, max = 512))]
    pub client_secret: String,
}

/// `PUT /admin/oauth/{provider}`: the tenant registers its own OAuth app (secret key only).
#[utoipa::path(
    put,
    path = "/auth/v1/admin/oauth/{provider}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = ProviderCredentialsBody,
    params(("provider" = String, Path, description = "`google` or `github`")),
    responses(
        (status = 204, description = "Provider configured with the tenant's own OAuth app"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "Unknown provider", body = ErrorBody),
    )
)]
pub async fn configure_oauth_provider(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(provider_name): Path<String>,
    ValidatedJson(body): ValidatedJson<ProviderCredentialsBody>,
) -> Result<StatusCode, ApiError> {
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

    let key = ProviderKey {
        tenant_id: admin.tenant_id,
        provider,
    };
    let client_secret_ciphertext = state
        .secret_box
        .seal(client_secret.as_bytes(), &client_secret_context(key))
        .map_err(ApiError::internal)?;
    let registration = ProviderRegistration {
        tenant_id: admin.tenant_id,
        provider,
        client_id,
        client_secret_ciphertext: &client_secret_ciphertext,
    };
    upsert_provider_credentials(&state.control_plane_pool, registration)
        .await
        .map_err(ApiError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}
