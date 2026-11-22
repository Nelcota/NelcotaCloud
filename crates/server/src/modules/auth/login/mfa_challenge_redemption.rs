use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::auth::login::locked_mfa_challenge::LockedChallenge;
use crate::modules::auth::mfa::factor_code_access::FactorCodeAccess;
use crate::modules::auth::mfa::factor_code_check::{
    FactorCodeCheck, FactorCodeOutcome, FactorState, check_factor_code,
};
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::session_grant::TokenSigning;
use crate::modules::auth::session::session_issuer::SessionTokens;
use crate::modules::auth::user::user_record::User;
use crate::modules::tenants::access::tenant_context::TenantContext;
use crate::modules::tenants::audit::audit_action::AuditAction;
use crate::modules::tenants::audit::audit_entry::NewAuditEvent;
use crate::modules::tenants::audit::audit_recorder::record_audit_event;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_origin::RequestOrigin;
use crate::shared::rate_limiting::attempt_limiter::Attempt;

/// The second step of a login with MFA on: the challenge token and the code typed for it.
pub struct ChallengeAnswer<'a> {
    pub mfa_token: &'a str,
    pub code: &'a str,
    pub origin: RequestOrigin,
}

/// Each challenge allows a few wrong codes; after that the login starts over.
pub async fn redeem_mfa_challenge(
    (access, signing): (&FactorCodeAccess<'_>, &TokenSigning<'_>),
    tenant: &TenantContext,
    answer: ChallengeAnswer<'_>,
) -> Result<SessionTokens, ApiError> {
    let mut challenge = LockedChallenge::lock(&tenant.pool, answer.mfa_token).await?;
    let attempt = CodeAttempt {
        tenant_id: tenant.tenant_id,
        user: &challenge.user,
        answer: &answer,
    };
    let outcome = check_code(access, &mut challenge.transaction, attempt).await?;

    match outcome {
        FactorCodeOutcome::Accepted => {
            challenge
                .start_session(signing, (tenant.tenant_id, answer.origin))
                .await
        }
        // Removed (e.g. by an admin) since the login started: nothing to check against.
        FactorCodeOutcome::NoFactor => Err(ApiError::from(AuthRejection::InvalidToken)),
        FactorCodeOutcome::Rejected => {
            let user_id = challenge.user.id;
            let error = challenge.reject().await;
            let wrong_code = (user_id, answer.origin.clone());
            record_wrong_code(tenant, wrong_code, &error).await;
            Err(error)
        }
    }
}

/// Only a code that was refused, not a failure to record the refusal.
async fn record_wrong_code(
    tenant: &TenantContext,
    (user_id, origin): (Uuid, RequestOrigin),
    error: &ApiError,
) {
    if error.rejection_code() != Some(AuthRejection::InvalidMfaCode.code()) {
        return;
    }

    let event = NewAuditEvent::by_user(AuditAction::MfaCodeFailed, user_id, origin);
    record_audit_event(&tenant.pool, event).await;
}

/// A code typed for the challenge of `user`.
struct CodeAttempt<'a> {
    tenant_id: Uuid,
    user: &'a User,
    answer: &'a ChallengeAnswer<'a>,
}

/// Rate limited per user and client, then checked against the user's active authenticator.
async fn check_code(
    access: &FactorCodeAccess<'_>,
    transaction: &mut PgConnection,
    attempt: CodeAttempt<'_>,
) -> Result<FactorCodeOutcome, ApiError> {
    let limited = Attempt {
        tenant_id: attempt.tenant_id,
        email: &attempt.user.email,
        client_ip: attempt.answer.origin.client_ip,
    };
    access.limiter.check_mfa(&limited).await?;
    let check = FactorCodeCheck {
        tenant_id: attempt.tenant_id,
        user_id: attempt.user.id,
        code: attempt.answer.code,
        expected: FactorState::Verified,
    };
    let outcome = check_factor_code(transaction, access.secret_box, check).await;

    outcome.map_err(ApiError::internal)
}
