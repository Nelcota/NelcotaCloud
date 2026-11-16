use axum::extract::{Path, Query, State};
use axum::response::Redirect;
use oauth2::url::Url;
use serde::Deserialize;
use validator::Validate;

use crate::app_state::AppState;
use crate::http::api_error::ApiError;
use crate::http::routes::loaded_tenant_settings::load_tenant_settings;
use crate::http::tenant_context::TenantContext;
use crate::oauth::oauth_login::{AuthorizationStart, OAuthLoginError};
use crate::oauth::oauth_provider::OAuthProvider;

#[derive(Deserialize, Validate)]
pub struct AuthorizeQuery {
    /// The publishable key travels in the query: this endpoint is opened by a browser redirect.
    #[validate(length(min = 1, max = 256))]
    pub apikey: String,
    #[validate(length(min = 1, max = 2048))]
    pub redirect_to: String,
}

/// `GET /oauth/{provider}/authorize`: redirects the browser to the provider's sign-in page.
pub async fn authorize_oauth(
    State(state): State<AppState>,
    Path(provider_name): Path<String>,
    Query(query): Query<AuthorizeQuery>,
) -> Result<Redirect, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let tenant = TenantContext::resolve(&state, &query.apikey).await?;
    let Some(provider) = OAuthProvider::parse(&provider_name) else {
        return Err(ApiError::UnknownOAuthProvider);
    };
    let redirect_to = allowed_redirect(&state, &tenant, &query.redirect_to).await?;
    let start = AuthorizationStart {
        tenant_id: tenant.tenant_id,
        provider,
        redirect_to,
    };
    let authorize_url = state
        .oauth_login_context()
        .start(start)
        .await
        .map_err(map_start_error)?;

    Ok(Redirect::to(authorize_url.as_str()))
}

/// Only URLs on the tenant's site origin are accepted, so the flow is not an open redirect.
async fn allowed_redirect(
    state: &AppState,
    tenant: &TenantContext,
    raw_redirect_to: &str,
) -> Result<Url, ApiError> {
    let redirect_to = Url::parse(raw_redirect_to.trim()).map_err(ApiError::invalid_request)?;
    let settings = load_tenant_settings(state, tenant.tenant_id).await?;
    let Some(site_url) = settings.site_url else {
        return Err(ApiError::InvalidRequest(
            "the tenant has no site_url configured".to_owned(),
        ));
    };

    if site_url.allows_redirect_to(&redirect_to) == false {
        return Err(ApiError::InvalidRequest(
            "redirect_to must be on the tenant's site_url origin".to_owned(),
        ));
    }

    Ok(redirect_to)
}

fn map_start_error(error: OAuthLoginError) -> ApiError {
    match error {
        OAuthLoginError::ProviderNotConfigured => ApiError::OAuthProviderNotConfigured,
        other => ApiError::internal(other),
    }
}
