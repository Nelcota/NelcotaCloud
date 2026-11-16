use axum::extract::{Query, State};
use axum::response::Redirect;
use oauth2::url::Url;
use serde::Deserialize;

use crate::app_state::AppState;
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::issue_one_time_token;
use crate::modules::oauth::login::authorization_completion::ProviderCallback;
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::modules::oauth::login::oauth_state_repository::{
    PendingAuthorization, take_pending_authorization,
};
use crate::shared::crypto::opaque_token::hash_opaque_token;
use crate::shared::http::api_error::ApiError;

const MAX_STATE_LENGTH: usize = 256;

#[derive(Deserialize)]
pub struct CallbackQuery {
    pub state: Option<String>,
    pub code: Option<String>,
}

/// `GET /oauth/callback`: the provider sends the browser here. On success the browser goes back
/// to the app with a short-lived `code` (exchanged at `POST /oauth/token`), never with tokens in
/// the URL; on failure, with an `error` code.
pub async fn oauth_callback(
    State(state): State<AppState>,
    Query(query): Query<CallbackQuery>,
) -> Result<Redirect, ApiError> {
    let pending = take_pending(&state, query.state).await?;
    let mut redirect_to = Url::parse(&pending.redirect_to).map_err(ApiError::internal)?;
    let login = complete_login(&state, &pending, query.code).await;

    match login {
        Ok(login_code) => {
            redirect_to
                .query_pairs_mut()
                .append_pair("code", &login_code);
        }
        Err(error) => {
            tracing::warn!(%error, tenant_id = %pending.tenant_id, "OAuth login failed");
            redirect_to
                .query_pairs_mut()
                .append_pair("error", error.redirect_error_code());
        }
    }

    Ok(Redirect::to(redirect_to.as_str()))
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
    let callback = ProviderCallback {
        pending,
        tenant_pool: &tenant_pool,
        code,
    };
    let user = state.oauth_login_context().finish(callback).await?;
    let login_code =
        issue_one_time_token(&tenant_pool, user.id, OneTimeTokenPurpose::OAuthLogin).await?;

    Ok(login_code)
}
