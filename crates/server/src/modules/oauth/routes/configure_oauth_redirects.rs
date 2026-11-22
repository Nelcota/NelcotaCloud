use axum::Json;
use axum::extract::State;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::oauth::login::redirects::save_redirects;
use crate::modules::tenants::access::tenant_admin::TenantAdmin;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::project_change::{ProjectChange, record_project_change};
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate, ToSchema)]
pub struct OAuthRedirectsBody {
    /// Exact app callback URLs. An empty list restores the project's site URL.
    #[validate(length(max = 10))]
    pub redirect_urls: Vec<String>,
}

#[derive(Serialize, ToSchema)]
pub struct OAuthRedirects {
    pub redirect_urls: Vec<String>,
}

/// Replace the project's registered app callback URLs.
#[utoipa::path(
    put,
    path = "/auth/v1/admin/oauth/redirects",
    tag = "tenant-admin",
    security(("api_key" = []), ("platform_account" = [], "project" = [])),
    request_body = OAuthRedirectsBody,
    responses(
        (status = 200, description = "Effective app callback URLs", body = OAuthRedirects),
        (status = 400, description = "Invalid callback URL", body = ErrorBody),
        (status = 403, description = "Project access denied", body = ErrorBody),
    )
)]
pub async fn configure_oauth_redirects(
    State(state): State<AppState>,
    admin: TenantAdmin,
    ValidatedJson(body): ValidatedJson<OAuthRedirectsBody>,
) -> Result<Json<OAuthRedirects>, ApiError> {
    if body.redirect_urls.iter().any(|url| url.len() > 2048) {
        return Err(ApiError::InvalidRequest(
            "OAuth callback URL is too long".to_owned(),
        ));
    }

    let redirect_urls = save_redirects(
        &state.control_plane_pool,
        admin.tenant_id,
        &body.redirect_urls,
    )
    .await?;
    let change = ProjectChange {
        tenant_id: admin.tenant_id,
        author: admin.author(),
        action: AuditAction::SettingsChanged,
        details: serde_json::json!({ "section": "oauth_redirects" }),
    };
    record_project_change(&state.tenant_pools, change).await;

    Ok(Json(OAuthRedirects { redirect_urls }))
}
