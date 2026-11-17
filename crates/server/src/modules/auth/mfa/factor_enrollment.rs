use sqlx::PgPool;
use totp_rs::TotpError;
use uuid::Uuid;

use crate::modules::auth::mfa::mfa_factor_repository::{
    PendingMfaFactor, mfa_secret_context, replace_pending_mfa_factor,
};
use crate::modules::auth::mfa::totp_code::{TotpEnrollment, TotpLabel, new_totp_enrollment};
use crate::shared::crypto::secret_box::{SecretBox, SecretBoxError};

#[derive(Debug, thiserror::Error)]
pub enum FactorEnrollmentError {
    #[error("TOTP is already enabled")]
    AlreadyEnabled,
    #[error("could not create the TOTP secret: {0}")]
    Secret(#[from] TotpError),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("database error while adding an authenticator: {0}")]
    Database(#[from] sqlx::Error),
}

/// A user adding an authenticator, labelled as their apps will show it.
pub struct FactorEnrollment<'a> {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub label: TotpLabel<'a>,
}

/// A new authenticator, active once its first code is verified.
pub struct EnrolledFactor {
    pub factor_id: Uuid,
    pub enrollment: TotpEnrollment,
}

/// Replaces an earlier pending authenticator; refused while one is already active.
pub async fn enroll_factor(
    tenant_pool: &PgPool,
    secret_box: &SecretBox,
    request: FactorEnrollment<'_>,
) -> Result<EnrolledFactor, FactorEnrollmentError> {
    let enrollment = new_totp_enrollment(&request.label)?;
    let factor_id = Uuid::new_v4();
    let context = mfa_secret_context(request.tenant_id, factor_id);
    let secret_ciphertext = secret_box.seal(&enrollment.secret, &context)?;
    let factor = PendingMfaFactor {
        id: factor_id,
        user_id: request.user_id,
        secret_ciphertext: &secret_ciphertext,
    };

    if replace_pending_mfa_factor(tenant_pool, factor).await? == false {
        return Err(FactorEnrollmentError::AlreadyEnabled);
    }

    Ok(EnrolledFactor {
        factor_id,
        enrollment,
    })
}
