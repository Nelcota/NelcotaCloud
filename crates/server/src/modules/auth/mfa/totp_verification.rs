use sqlx::PgConnection;
use totp_rs::TotpError;
use uuid::Uuid;

use crate::modules::auth::mfa::mfa_factor_repository::{
    StoredMfaFactor, mfa_secret_context, use_mfa_step,
};
use crate::modules::auth::mfa::totp_code::matched_step;
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};

#[derive(Debug, thiserror::Error)]
pub enum TotpVerificationError {
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("stored TOTP secret is invalid: {0}")]
    Secret(#[from] TotpError),
    #[error("TOTP time step does not fit in the database")]
    StepOutOfRange,
    #[error("database error while checking a TOTP code: {0}")]
    Database(#[from] sqlx::Error),
}

/// A code typed by the user for one of their authenticators.
pub struct TotpAttempt<'a> {
    pub tenant_id: Uuid,
    pub factor: &'a StoredMfaFactor,
    pub code: &'a str,
}

/// `true` when the code is right and its time step was never used before; the step is then
/// recorded (and a pending authenticator becomes verified).
pub async fn accept_totp_code(
    connection: &mut PgConnection,
    secret_box: &SecretBox,
    attempt: TotpAttempt<'_>,
) -> Result<bool, TotpVerificationError> {
    let factor = attempt.factor;
    let context = mfa_secret_context(attempt.tenant_id, factor.id);
    let secret = secret_box.open(&factor.secret_ciphertext, &context)?;
    let step = match matched_step(&secret, attempt.code)? {
        Some(step) => step,
        None => return Ok(false),
    };
    let step = i64::try_from(step).map_err(|_| TotpVerificationError::StepOutOfRange)?;

    Ok(use_mfa_step(connection, factor.id, step).await?)
}
