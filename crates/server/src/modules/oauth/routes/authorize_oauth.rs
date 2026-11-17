use axum::extract::{Path, Query, State};
use axum::response::Redirect;
use oauth2::url::Url;
use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::oauth::login::app_pkce::parse_code_challenge;
use crate::modules::oauth::login::authorization_start::AuthorizationStart;
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::rejection::oauth_rejection::OAuthRejection;
use crate::modules::tenants::access::api_key_tenant::ApiKeyTenant;
use crate::modules::tenants::settings::loaded_tenant_settings::load_tenant_settings;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::client_ip::ClientIp;

const S256_METHOD: &str = "S256";

#[derive(Deserialize, Validate, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct AuthorizeQuery {
    /// The publishable key travels in the query: this endpoint is opened by a browser redirect.
    #[validate(length(min = 1, max = 256))]
    pub apikey: String,
    #[validate(length(min = 1, max = 2048))]
    pub redirect_to: String,
    #[validate(length(min = 1, max = 128))]
    pub code_challenge: String,
    /// Only S256 is supported; it may be omitted.
    pub code_challenge_method: Option<String>,
}

/// `GET /oauth/{provider}/authorize`: redirects the browser to the provider's sign-in page.
#[utoipa::path(
    get,
    path = "/auth/v1/oauth/{provider}/authorize",
    tag = "oauth",
    params(("provider" = String, Path, description = "`google` or `github`"), AuthorizeQuery),
    responses(
        (status = 303, description = "Redirects the browser to the provider's sign-in page"),
        (status = 400, description = "Invalid redirect, PKCE challenge or provider not configured", body = ErrorBody),
        (status = 401, description = "Invalid API key", body = ErrorBody),
        (status = 404, description = "Unknown provider", body = ErrorBody),
        (status = 429, description = "Too many attempts", body = ErrorBody),
    )
)]
pub async fn authorize_oauth(
    State(state): State<AppState>,
    Path(provider_name): Path<String>,
    ClientIp(client_ip): ClientIp,
    Query(query): Query<AuthorizeQuery>,
) -> Result<Redirect, ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let tenant = ApiKeyTenant::resolve(&state, &query.apikey).await?;
    state
        .rate_limits
        .oauth_authorization
        .check(tenant.tenant_id, client_ip)?;
    let start = AuthorizationStart {
        tenant_id: tenant.tenant_id,
        provider: known_provider(&provider_name)?,
        redirect_to: allowed_redirect(&state, tenant.tenant_id, &query.redirect_to).await?,
        app_code_challenge: app_code_challenge(&query)?,
    };
    let authorize_url = state
        .oauth_login_context()
        .start(start)
        .await
        .map_err(map_start_error)?;

    Ok(Redirect::to(authorize_url.as_str()))
}

fn app_code_challenge(query: &AuthorizeQuery) -> Result<String, ApiError> {
    let method = query.code_challenge_method.as_deref().map(str::trim);

    if method.is_some_and(|method| method != S256_METHOD) {
        return Err(ApiError::InvalidRequest(
            "code_challenge_method must be S256".to_owned(),
        ));
    }

    parse_code_challenge(&query.code_challenge).map_err(ApiError::invalid_request)
}

/// Only URLs under the tenant's site URL are accepted, so the flow is not an open redirect.
async fn allowed_redirect(
    state: &AppState,
    tenant_id: Uuid,
    raw_redirect_to: &str,
) -> Result<Url, ApiError> {
    let redirect_to = Url::parse(raw_redirect_to.trim()).map_err(ApiError::invalid_request)?;
    let settings = load_tenant_settings(&state.control_plane_pool, tenant_id).await?;

    if settings.site_url.allows_redirect_to(&redirect_to) == false {
        return Err(ApiError::InvalidRequest(
            "redirect_to must be under the tenant's site_url".to_owned(),
        ));
    }

    Ok(redirect_to)
}

fn map_start_error(error: OAuthLoginError) -> ApiError {
    match error {
        OAuthLoginError::ProviderNotConfigured => {
            ApiError::from(OAuthRejection::OAuthProviderNotConfigured)
        }
        other => ApiError::internal(other),
    }
}

fn known_provider(provider_name: &str) -> Result<OAuthProvider, ApiError> {
    let Some(provider) = OAuthProvider::parse(provider_name) else {
        return Err(ApiError::from(OAuthRejection::UnknownOAuthProvider));
    };

    Ok(provider)
}
