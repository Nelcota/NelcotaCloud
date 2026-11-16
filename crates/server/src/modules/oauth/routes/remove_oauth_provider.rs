use axum::extract::{Path, State};
use axum::http::StatusCode;

use crate::app_state::AppState;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::provider::oauth_provider_repository::{
    ProviderKey, delete_provider_credentials,
};
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::shared::http::api_error::{ApiError, ErrorBody};

/// `DELETE /admin/oauth/{provider}`: the tenant stops offering login with this provider.
#[utoipa::path(
    delete,
    path = "/auth/v1/admin/oauth/{provider}",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    params(("provider" = String, Path, description = "`google` or `github`")),
    responses(
        (status = 204, description = "Provider removed (or was not configured)"),
        (status = 403, description = "Requires the secret API key, or membership in the project", body = ErrorBody),
        (status = 404, description = "Unknown provider", body = ErrorBody),
    )
)]
pub async fn remove_oauth_provider(
    State(state): State<AppState>,
    admin: TenantAdmin,
    Path(provider_name): Path<String>,
) -> Result<StatusCode, ApiError> {
    let Some(provider) = OAuthProvider::parse(&provider_name) else {
        return Err(ApiError::UnknownOAuthProvider);
    };
    let key = ProviderKey {
        tenant_id: admin.tenant_id,
        provider,
    };
    delete_provider_credentials(&state.control_plane_pool, key)
        .await
        .map_err(ApiError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}
