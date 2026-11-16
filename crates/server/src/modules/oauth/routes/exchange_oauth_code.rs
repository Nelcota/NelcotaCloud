use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use validator::Validate;

use crate::app_state::AppState;
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, issue_session};
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::oauth::login::app_pkce::verifier_matches;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::validated_json::ValidatedJson;

#[derive(Deserialize, Validate)]
pub struct OAuthCodeBody {
    #[validate(length(min = 1, max = 256))]
    pub code: String,
    #[validate(length(min = 1, max = 128))]
    pub code_verifier: String,
}

/// `POST /oauth/token`: trades the one-time code from the OAuth redirect for a session. The
/// code is consumed even when the verifier is wrong, so it cannot be guessed against.
pub async fn exchange_oauth_code(
    State(state): State<AppState>,
    tenant: TenantContext,
    ValidatedJson(body): ValidatedJson<OAuthCodeBody>,
) -> Result<Json<SessionTokens>, ApiError> {
    let mut connection = tenant.pool.acquire().await.map_err(ApiError::internal)?;
    let purpose = OneTimeTokenPurpose::OAuthLogin;
    let consumed = consume_one_time_token(&mut connection, purpose, &body.code)
        .await
        .map_err(ApiError::internal)?;
    let Some(consumed) = consumed else {
        return Err(ApiError::InvalidOAuthCode);
    };
    let Some(code_challenge) = consumed.code_challenge else {
        return Err(ApiError::InvalidOAuthCode);
    };

    if verifier_matches(&body.code_verifier, &code_challenge) == false {
        return Err(ApiError::InvalidOAuthCode);
    }

    let user = find_user_by_id(&tenant.pool, consumed.user_id)
        .await
        .map_err(ApiError::internal)?;
    let Some(user) = user else {
        return Err(ApiError::InvalidOAuthCode);
    };
    let grant = SessionGrant {
        user,
        family: SessionFamily::new_login(),
    };

    Ok(Json(issue_session(&state, &tenant, grant).await?))
}
