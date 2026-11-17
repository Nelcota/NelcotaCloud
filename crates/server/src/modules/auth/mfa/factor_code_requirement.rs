use std::net::IpAddr;

use sqlx::PgConnection;

use crate::app_state::AppState;
use crate::modules::auth::mfa::factor_code_check::{
    FactorCodeCheck, FactorCodeOutcome, FactorState, check_factor_code,
};
use crate::modules::auth::mfa::mfa_factor_repository::delete_mfa_factor;
use crate::modules::auth::rate_limiting::attempt_limiter::Attempt;
use crate::modules::auth::rejection::auth_rejection::AuthRejection;
use crate::modules::auth::session::authenticated_user::AuthenticatedUser;
use crate::modules::auth::user::user_events::{UserChange, record_user_change};
use crate::modules::webhooks::event::webhook_event_type::WebhookEventType;
use crate::shared::http::api_error::ApiError;

/// A signed-in user typing a code from their authenticator app.
pub struct FactorCodeRequest<'a> {
    pub authenticated: &'a AuthenticatedUser,
    pub code: &'a str,
    pub client_ip: IpAddr,
}

/// The first code turns the pending authenticator on.
pub async fn activate_factor(
    state: &AppState,
    request: &FactorCodeRequest<'_>,
) -> Result<(), ApiError> {
    let tenant = &request.authenticated.tenant;
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let mut transaction = tenant.pool.begin().await?;
    require_code(state, &mut transaction, (request, FactorState::Pending)).await?;
    let change = mfa_change(request);
    record_user_change(&mut transaction, &webhooks, change).await?;
    transaction.commit().await?;

    Ok(())
}

/// A current code is required, so a stolen access token alone cannot remove the second factor.
pub async fn disable_factor(
    state: &AppState,
    request: &FactorCodeRequest<'_>,
) -> Result<(), ApiError> {
    let authenticated = request.authenticated;
    let tenant = &authenticated.tenant;
    let webhooks = state.webhooks.recorder(tenant.tenant_id).await?;
    let mut transaction = tenant.pool.begin().await?;
    require_code(state, &mut transaction, (request, FactorState::Verified)).await?;
    delete_mfa_factor(&mut *transaction, authenticated.claims.sub).await?;
    record_user_change(&mut transaction, &webhooks, mfa_change(request)).await?;
    transaction.commit().await?;

    Ok(())
}

/// `mfa_enabled` changed: receivers get the user as it is now.
fn mfa_change(request: &FactorCodeRequest<'_>) -> UserChange {
    UserChange {
        event_type: WebhookEventType::UserUpdated,
        user_id: request.authenticated.claims.sub,
    }
}

/// Rate limited per user and client, then checked against the authenticator in `expected` state.
async fn require_code(
    state: &AppState,
    connection: &mut PgConnection,
    (request, expected): (&FactorCodeRequest<'_>, FactorState),
) -> Result<(), ApiError> {
    let authenticated = request.authenticated;
    let tenant_id = authenticated.tenant.tenant_id;
    let claims = &authenticated.claims;
    let attempt = Attempt {
        tenant_id,
        email: &claims.email,
        client_ip: request.client_ip,
    };
    state.rate_limits.mfa.check(&attempt)?;
    let check = FactorCodeCheck {
        tenant_id,
        user_id: claims.sub,
        code: request.code,
        expected,
    };
    let outcome = check_factor_code(connection, &state.secret_box, check).await;

    accepted_or_refused(outcome.map_err(ApiError::internal)?, expected)
}

fn accepted_or_refused(outcome: FactorCodeOutcome, expected: FactorState) -> Result<(), ApiError> {
    match (outcome, expected) {
        (FactorCodeOutcome::Accepted, _) => Ok(()),
        (FactorCodeOutcome::Rejected, _) => Err(ApiError::from(AuthRejection::InvalidMfaCode)),
        (FactorCodeOutcome::NoFactor, FactorState::Verified) => {
            Err(ApiError::NotFound("enabled authenticator"))
        }
        (FactorCodeOutcome::NoFactor, FactorState::Pending) => {
            Err(ApiError::NotFound("pending authenticator"))
        }
    }
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use super::*;

    fn status_of(outcome: FactorCodeOutcome, expected: FactorState) -> Option<StatusCode> {
        let refusal = accepted_or_refused(outcome, expected).err()?;

        Some(refusal.into_response().status())
    }

    #[test]
    fn an_accepted_code_passes_for_either_authenticator() {
        assert_eq!(
            status_of(FactorCodeOutcome::Accepted, FactorState::Verified),
            None
        );
        assert_eq!(
            status_of(FactorCodeOutcome::Accepted, FactorState::Pending),
            None
        );
    }

    #[test]
    fn a_wrong_code_is_unauthorized() {
        let status = status_of(FactorCodeOutcome::Rejected, FactorState::Pending);

        assert_eq!(status, Some(StatusCode::UNAUTHORIZED));
    }

    /// Disabling needs an active authenticator, verifying a pending one: either missing is 404.
    #[test]
    fn a_missing_authenticator_is_not_found() {
        let disabling = accepted_or_refused(FactorCodeOutcome::NoFactor, FactorState::Verified);
        let verifying = accepted_or_refused(FactorCodeOutcome::NoFactor, FactorState::Pending);

        assert!(matches!(
            disabling,
            Err(ApiError::NotFound("enabled authenticator"))
        ));
        assert!(matches!(
            verifying,
            Err(ApiError::NotFound("pending authenticator"))
        ));
    }
}
