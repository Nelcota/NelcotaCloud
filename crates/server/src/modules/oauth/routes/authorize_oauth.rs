use axum::extract::{Path, Query, State};
use axum::http::header::REFERRER_POLICY;
use axum::response::Redirect;
use serde::Deserialize;
use url::Url;
use utoipa::IntoParams;
use uuid::Uuid;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::oauth::login::app_pkce::parse_code_challenge;
use crate::modules::oauth::login::authorization_start::AuthorizationStart;
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::login::redirects::require_registered_redirect;
use crate::modules::oauth::provider::oauth_provider::OAuthProvider;
use crate::modules::oauth::rejection::oauth_rejection::OAuthRejection;
use crate::modules::tenants::access::api_key_tenant::ApiKeyTenant;
use crate::modules::tenants::ip_blocks::address_guard::ensure_address_allowed;
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
) -> Result<([(axum::http::HeaderName, &'static str); 1], Redirect), ApiError> {
    query.validate().map_err(ApiError::invalid_request)?;
    let tenant = ApiKeyTenant::resolve_publishable(&state, &query.apikey).await?;
    let pool = state
        .tenant_pools
        .pool_for(tenant.tenant_id)
        .await
        .map_err(ApiError::internal)?;
    ensure_address_allowed(&pool, client_ip).await?;
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

    Ok((
        [(REFERRER_POLICY, "no-referrer")],
        Redirect::to(authorize_url.as_str()),
    ))
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

/// The app must use one of the project's registered callback URLs.
async fn allowed_redirect(
    state: &AppState,
    tenant_id: Uuid,
    raw_redirect_to: &str,
) -> Result<Url, ApiError> {
    let redirect_to = Url::parse(raw_redirect_to.trim()).map_err(ApiError::invalid_request)?;
    require_registered_redirect(&state.control_plane_pool, tenant_id, &redirect_to).await?;

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
    let provider =
        OAuthProvider::parse(provider_name).ok_or(OAuthRejection::UnknownOAuthProvider)?;

    Ok(provider)
}
