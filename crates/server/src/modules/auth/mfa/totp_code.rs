use time::OffsetDateTime;
use totp_rs::{Builder, Totp, TotpError};

use crate::shared::crypto::random_bytes::random_bytes;

/// 160 bits, the size RFC 4226 recommends for HMAC-SHA1 secrets.
pub const TOTP_SECRET_BYTES: usize = 20;
const CODE_LENGTH: usize = 6;

/// A new authenticator for a user to scan or type into their app.
pub struct TotpEnrollment {
    pub secret: [u8; TOTP_SECRET_BYTES],
    pub secret_base32: String,
    /// `otpauth://` URI, usually shown as a QR code.
    pub otpauth_uri: String,
}

/// Who the code is for, as authenticator apps show it.
pub struct TotpLabel<'a> {
    pub issuer: &'a str,
    pub account: &'a str,
}

pub fn new_totp_enrollment(label: &TotpLabel) -> Result<TotpEnrollment, TotpError> {
    let secret = random_bytes::<TOTP_SECRET_BYTES>();
    let totp = build_totp(&secret, label)?;

    Ok(TotpEnrollment {
        secret,
        secret_base32: totp.secret().to_base32(),
        otpauth_uri: totp.to_url()?,
    })
}

/// The time step a code belongs to (current, previous or next), or `None` if it is wrong.
/// The caller must accept each step only once.
pub fn matched_step(secret: &[u8], code: &str) -> Result<Option<u64>, TotpError> {
    let digits: String = code
        .chars()
        .filter(|character| character.is_whitespace() == false)
        .collect();

    if digits.len() != CODE_LENGTH
        || digits.chars().all(|character| character.is_ascii_digit()) == false
    {
        return Ok(None);
    }

    let label = TotpLabel {
        issuer: "NelcotaCloud",
        account: "user",
    };
    let totp = build_totp(secret, &label)?;
    let Ok(now) = u64::try_from(OffsetDateTime::now_utc().unix_timestamp()) else {
        return Ok(None);
    };

    Ok(totp.check(&digits, now))
}

/// Authenticator apps split the label on `:`, so it is removed from both parts.
fn build_totp(secret: &[u8], label: &TotpLabel) -> Result<Totp, TotpError> {
    let issuer = label.issuer.replace(':', " ");
    let account = label.account.replace(':', " ");

    Builder::new()
        .with_secret(secret.to_vec())
        .with_issuer(Some(issuer))
        .with_account_name(account)
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn label() -> TotpLabel<'static> {
        TotpLabel {
            issuer: "Acme: Inc",
            account: "ana@example.com",
        }
    }

    #[test]
    fn accepts_the_current_code_once_per_step() -> Result<(), TotpError> {
        let enrollment = new_totp_enrollment(&label())?;
        let totp = build_totp(&enrollment.secret, &label())?;
        let now = u64::try_from(OffsetDateTime::now_utc().unix_timestamp()).unwrap_or_default();
        let code = totp.generate(now).to_string();

        assert!(matched_step(&enrollment.secret, &code)?.is_some());
        Ok(())
    }

    #[test]
    fn rejects_malformed_and_wrong_codes() -> Result<(), TotpError> {
        let enrollment = new_totp_enrollment(&label())?;

        for code in ["", "12345", "1234567", "abcdef"] {
            assert_eq!(matched_step(&enrollment.secret, code)?, None, "{code}");
        }

        Ok(())
    }

    #[test]
    fn uri_names_issuer_and_account() -> Result<(), TotpError> {
        let enrollment = new_totp_enrollment(&label())?;

        assert!(enrollment.otpauth_uri.starts_with("otpauth://totp/"));
        assert!(
            enrollment.otpauth_uri.contains("ana%40example.com")
                || enrollment.otpauth_uri.contains("ana@example.com")
        );
        Ok(())
    }
}
