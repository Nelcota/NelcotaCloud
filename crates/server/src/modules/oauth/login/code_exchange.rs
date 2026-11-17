use sqlx::PgConnection;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::login::login_completion::{LoginResponse, complete_login};
use crate::modules::auth::one_time_token::one_time_token_purpose::OneTimeTokenPurpose;
use crate::modules::auth::one_time_token::one_time_token_repository::consume_one_time_token;
use crate::modules::auth::session::session_family::SessionFamily;
use crate::modules::auth::session::session_grant::{SessionGrant, SessionRequest};
use crate::modules::auth::user::user_lookup::find_user_by_id;
use crate::modules::oauth::login::app_pkce::verifier_matches;
use crate::modules::oauth::rejection::oauth_rejection::OAuthRejection;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;

/// The one-time code from the OAuth redirect and the app's PKCE verifier for it.
pub struct LoginCodeExchange<'a> {
    pub code: &'a str,
    pub code_verifier: &'a str,
}

/// Trades the code for a session. The code is consumed even when the verifier is wrong, so it
/// cannot be guessed against.
pub async fn exchange_login_code(
    state: &AppState,
    tenant: &TenantContext,
    exchange: LoginCodeExchange<'_>,
) -> Result<LoginResponse, ApiError> {
    let mut connection = tenant.pool.acquire().await?;
    let user_id = redeem_code(&mut connection, exchange).await?;
    let user = find_user_by_id(&tenant.pool, user_id).await?;
    let Some(user) = user else {
        return Err(ApiError::from(OAuthRejection::InvalidOAuthCode));
    };
    let request = SessionRequest {
        tenant_id: tenant.tenant_id,
        connection: &mut connection,
        grant: SessionGrant {
            user,
            family: SessionFamily::new_login(),
        },
    };

    complete_login(state, request).await
}

/// The user the code was issued for, once the verifier matches the app's challenge.
async fn redeem_code(
    connection: &mut PgConnection,
    exchange: LoginCodeExchange<'_>,
) -> Result<Uuid, ApiError> {
    let purpose = OneTimeTokenPurpose::OAuthLogin;
    let consumed = consume_one_time_token(connection, purpose, exchange.code).await?;
    let Some(consumed) = consumed else {
        return Err(ApiError::from(OAuthRejection::InvalidOAuthCode));
    };
    let Some(code_challenge) = consumed.code_challenge else {
        return Err(ApiError::from(OAuthRejection::InvalidOAuthCode));
    };

    if verifier_matches(exchange.code_verifier, &code_challenge) == false {
        return Err(ApiError::from(OAuthRejection::InvalidOAuthCode));
    }

    Ok(consumed.user_id)
}
