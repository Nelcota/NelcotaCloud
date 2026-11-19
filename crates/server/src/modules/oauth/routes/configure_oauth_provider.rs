use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::json;
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::provider::oauth_provider_repository::ProviderKey;
use crate::modules::oauth::provider::provider_credentials_change::{
    OAuthCredentialsInput, SaveOAuthCredentialsError, save_provider_credentials,
};
use crate::modules::oauth::rejection::oauth_rejection::OAuthRejection;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};
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
    let provider =
        OAuthProvider::parse(&provider_name).ok_or(OAuthRejection::UnknownOAuthProvider)?;
    let credentials = OAuthCredentialsInput {
        key: ProviderKey {
            tenant_id: admin.tenant_id,
            provider,
        },
        client_id: &body.client_id,
        client_secret: &body.client_secret,
    };
    save_provider_credentials(&state.control_plane_pool, &state.secret_box, credentials)
        .await
        .map_err(map_credentials_error)?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: json!({ "section": "oauth_provider", "provider": provider.as_str() }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(StatusCode::NO_CONTENT)
}

fn map_credentials_error(error: SaveOAuthCredentialsError) -> ApiError {
    match error {
        SaveOAuthCredentialsError::Blank => ApiError::invalid_request(error),
        other => ApiError::internal(other),
    }
}

#[cfg(test)]
mod tests {
    use axum::response::IntoResponse;

    use super::*;

    #[test]
    fn blank_credentials_are_the_admin_s_to_fix() {
        let blank = map_credentials_error(SaveOAuthCredentialsError::Blank);
        let database = map_credentials_error(SaveOAuthCredentialsError::Database(
            sqlx::Error::RowNotFound,
        ));

        assert_eq!(blank.into_response().status(), StatusCode::BAD_REQUEST);
        assert_eq!(
            database.into_response().status(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }
}
