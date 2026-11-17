use std::net::IpAddr;

use sqlx::PgConnection;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::login::locked_mfa_challenge::LockedChallenge;
use crate::modules::auth::mfa::factor_code_check::{
    FactorCodeCheck, FactorCodeOutcome, FactorState, check_factor_code,
};
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::shared::http::api_error::ApiError;

/// The second step of a login with MFA on: the challenge token and the code typed for it.
pub struct ChallengeAnswer<'a> {
    pub mfa_token: &'a str,
    pub code: &'a str,
    pub client_ip: IpAddr,
}

/// Each challenge allows a few wrong codes; after that the login starts over.
pub async fn redeem_mfa_challenge(
    state: &AppState,
    tenant: &TenantContext,
    answer: ChallengeAnswer<'_>,
) -> Result<SessionTokens, ApiError> {
    let mut challenge = LockedChallenge::lock(&tenant.pool, answer.mfa_token).await?;
    let attempt = CodeAttempt {
        tenant_id: tenant.tenant_id,
        user: &challenge.user,
        answer: &answer,
    };
    let outcome = check_code(state, &mut challenge.transaction, attempt).await?;

    match outcome {
        FactorCodeOutcome::Accepted => challenge.start_session(state, tenant.tenant_id).await,
        // Removed (e.g. by an admin) since the login started: nothing to check against.
        FactorCodeOutcome::NoFactor => Err(ApiError::from(AuthRejection::InvalidToken)),
        FactorCodeOutcome::Rejected => Err(challenge.reject().await),
    }
}

/// A code typed for the challenge of `user`.
struct CodeAttempt<'a> {
    tenant_id: Uuid,
    user: &'a User,
    answer: &'a ChallengeAnswer<'a>,
}

/// Rate limited per user and client, then checked against the user's active authenticator.
async fn check_code(
    state: &AppState,
    transaction: &mut PgConnection,
    attempt: CodeAttempt<'_>,
) -> Result<FactorCodeOutcome, ApiError> {
    let limited = Attempt {
        tenant_id: attempt.tenant_id,
        email: &attempt.user.email,
        client_ip: attempt.answer.client_ip,
    };
    state.rate_limits.mfa.check(&limited)?;
    let check = FactorCodeCheck {
        tenant_id: attempt.tenant_id,
        user_id: attempt.user.id,
        code: attempt.answer.code,
        expected: FactorState::Verified,
    };
    let outcome = check_factor_code(transaction, &state.secret_box, check).await;

    outcome.map_err(ApiError::internal)
}
