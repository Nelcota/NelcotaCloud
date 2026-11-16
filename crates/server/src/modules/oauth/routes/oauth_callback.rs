use crate::shared::http::api_error::ErrorBody;
use axum::extract::{Query, State};
use axum::response::Redirect;
use oauth2::url::Url;
use serde::Deserialize;
use utoipa::IntoParams;

use crate::app_state::AppState;
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::{
    OneTimeTokenRequest, issue_one_time_token,
};
use crate::modules::oauth::login::authorization_completion::ProviderCallback;
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::login::oauth_state_repository::{
    PendingAuthorization, take_pending_authorization,
};
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_span::record_tenant;

const MAX_STATE_LENGTH: usize = 256;
/// Parameters this endpoint sets on the app's redirect; copies already in it are removed so
/// nobody can plant a code of their own in front of the real one.
const RESERVED_REDIRECT_PARAMETERS: [&str; 3] = ["code", "error", "state"];

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct CallbackQuery {
    pub state: Option<String>,
    pub code: Option<String>,
}

/// `GET /oauth/callback`: the provider sends the browser here.
///
/// On success the browser goes back to the app with a short-lived `code` (exchanged at
/// `POST /oauth/token` with the app's PKCE verifier), never with tokens in the URL; on
/// failure, with an `error` code.
#[utoipa::path(
    get,
    path = "/auth/v1/oauth/callback",
    tag = "oauth",
    params(CallbackQuery),
    responses(
        (status = 303, description = "Redirects back to the app with a one-time `code`, or an `error`"),
        (status = 400, description = "Unknown or expired state", body = ErrorBody),
    )
)]
pub async fn oauth_callback(
    State(state): State<AppState>,
    Query(query): Query<CallbackQuery>,
) -> Result<Redirect, ApiError> {
    let pending = take_pending(&state, query.state).await?;
    // No API key reaches this endpoint: the tenant comes from the pending authorization.
    record_tenant(pending.tenant_id);
    let redirect_to = Url::parse(&pending.redirect_to).map_err(ApiError::internal)?;
    let login = complete_login(&state, &pending, query.code).await;
    let target = match login {
        Ok(login_code) => redirect_with(redirect_to, "code", &login_code),
        Err(error) => {
            log_failed_login(&error);
            redirect_with(redirect_to, "error", error.redirect_error_code())
        }
    };

    Ok(Redirect::to(target.as_str()))
}

/// Refusals (denied access, unverified or conflicting accounts) are expected outcomes; only
/// failures of this server or the provider are errors worth an alert.
fn log_failed_login(error: &OAuthLoginError) {
    if error.is_refusal() {
        tracing::info!(%error, "OAuth login refused");
        return;
    }

    tracing::error!(%error, "OAuth login failed");
}

fn redirect_with(redirect_to: Url, name: &str, value: &str) -> Url {
    let kept_pairs: Vec<(String, String)> = redirect_to
        .query_pairs()
        .filter(|(key, _)| RESERVED_REDIRECT_PARAMETERS.contains(&key.as_ref()) == false)
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect();
    let mut target = redirect_to;
    target.set_query(None);
    target
        .query_pairs_mut()
        .extend_pairs(kept_pairs)
        .append_pair(name, value);

    target
}

/// Without a valid state we do not know which app to return to, so this answers with an error.
async fn take_pending(
    state: &AppState,
    raw_state: Option<String>,
) -> Result<PendingAuthorization, ApiError> {
    let Some(raw_state) = raw_state else {
        return Err(ApiError::InvalidRequest("missing state".to_owned()));
    };

    if raw_state.len() > MAX_STATE_LENGTH {
        return Err(ApiError::InvalidRequest("invalid state".to_owned()));
    }

    let state_hash = hash_opaque_token(&raw_state);
    let pending = take_pending_authorization(&state.control_plane_pool, &state_hash)
        .await
        .map_err(ApiError::internal)?;
    let Some(pending) = pending else {
        return Err(ApiError::InvalidRequest(
            "unknown or expired OAuth state".to_owned(),
        ));
    };

    Ok(pending)
}

async fn complete_login(
    state: &AppState,
    pending: &PendingAuthorization,
    code: Option<String>,
) -> Result<String, OAuthLoginError> {
    let tenant_pool = state.tenant_pools.pool_for(pending.tenant_id).await?;
    // A blank code is no code: treat it as the user denying access, not as a server error.
    let code = code.filter(|code| code.trim().is_empty() == false);
    let callback = ProviderCallback {
        pending,
        tenant_pool: &tenant_pool,
        code,
    };
    let user = state.oauth_login_context().finish(callback).await?;
    let request = OneTimeTokenRequest {
        user_id: user.id,
        purpose: OneTimeTokenPurpose::OAuthLogin,
        code_challenge: Some(&pending.app_code_challenge),
    };

    Ok(issue_one_time_token(&tenant_pool, request).await?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_planted_codes_and_keeps_other_parameters() -> Result<(), oauth2::url::ParseError> {
        let planted = Url::parse("https://app.test/cb?code=nc_oc_attacker&tab=2&state=x")?;
        let target = redirect_with(planted, "code", "nc_oc_real");

        assert_eq!(target.as_str(), "https://app.test/cb?tab=2&code=nc_oc_real");
        Ok(())
    }
}
