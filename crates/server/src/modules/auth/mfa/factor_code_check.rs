use sqlx::PgConnection;
use uuid::Uuid;

use crate::modules::auth::mfa::mfa_factor_repository::find_mfa_factor;
use crate::modules::auth::mfa::totp_verification::{
    TotpAttempt, TotpVerificationError, accept_totp_code,
};
use crate::shared::crypto::secret_box::SecretBox;

/// Which authenticator a code is checked against: the active one, or one still being added.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum FactorState {
    Verified,
    Pending,
}

pub enum FactorCodeOutcome {
    Accepted,
    Rejected,
    /// The user has no authenticator in the expected state.
    NoFactor,
}

/// A code typed by a user for their authenticator in the `expected` state.
pub struct FactorCodeCheck<'a> {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub code: &'a str,
    pub expected: FactorState,
}

pub async fn check_factor_code(
    connection: &mut PgConnection,
    secret_box: &SecretBox,
    check: FactorCodeCheck<'_>,
) -> Result<FactorCodeOutcome, TotpVerificationError> {
    let factor = find_mfa_factor(&mut *connection, check.user_id).await?;
    let Some(factor) =
        factor.filter(|factor| state_of(factor.verified_at.is_some()) == check.expected)
    else {
        return Ok(FactorCodeOutcome::NoFactor);
    };
    let attempt = TotpAttempt {
        tenant_id: check.tenant_id,
        factor: &factor,
        code: check.code,
    };

    if accept_totp_code(connection, secret_box, attempt).await? {
        return Ok(FactorCodeOutcome::Accepted);
    }

    Ok(FactorCodeOutcome::Rejected)
}

fn state_of(is_verified: bool) -> FactorState {
    match is_verified {
        true => FactorState::Verified,
        false => FactorState::Pending,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_factor_is_verified_once_its_first_code_was_accepted() {
        assert!(state_of(true) == FactorState::Verified);
        assert!(state_of(false) == FactorState::Pending);
    }
}
