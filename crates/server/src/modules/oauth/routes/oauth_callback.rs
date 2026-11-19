use axum::extract::{Query, State};
use axum::response::Redirect;
use serde::Deserialize;
use url::Url;
use utoipa::IntoParams;

use crate::app_state::AppState;
use crate::modules::oauth::login::callback_completion::{
    CallbackServices, issue_login_code, take_pending,
};
use crate::modules::oauth::login::oauth_login_error::OAuthLoginError;
use crate::shared::http::api_error::{ApiError, ErrorBody};
use crate::shared::http::request_span::record_tenant;

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
    let pending = take_pending(&state.control_plane_pool, query.state).await?;
    // No API key reaches this endpoint: the tenant comes from the pending authorization.
    record_tenant(pending.tenant_id);
    let redirect_to = Url::parse(&pending.redirect_to).map_err(ApiError::internal)?;
    let services = CallbackServices {
        tenant_pools: &state.tenant_pools,
        webhooks: &state.webhooks,
        login: state.oauth_login_context(),
    };
    let login = issue_login_code(&services, &pending, query.code).await;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_planted_codes_and_keeps_other_parameters() -> Result<(), url::ParseError> {
        let planted = Url::parse("https://app.test/cb?code=nc_oc_attacker&tab=2&state=x")?;
        let target = redirect_with(planted, "code", "nc_oc_real");

        assert_eq!(target.as_str(), "https://app.test/cb?tab=2&code=nc_oc_real");
        Ok(())
    }
}
