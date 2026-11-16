use time::Duration;

/// What a one-time token is for; each purpose has its own prefix and lifetime.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OneTimeTokenPurpose {
    EmailVerification,
    PasswordReset,
    OAuthLogin,
}

impl OneTimeTokenPurpose {
    pub fn as_str(self) -> &'static str {
        match self {
            OneTimeTokenPurpose::EmailVerification => "email_verification",
            OneTimeTokenPurpose::PasswordReset => "password_reset",
            OneTimeTokenPurpose::OAuthLogin => "oauth_login",
        }
    }

    pub fn token_prefix(self) -> &'static str {
        match self {
            OneTimeTokenPurpose::EmailVerification => "nc_ev_",
            OneTimeTokenPurpose::PasswordReset => "nc_pr_",
            OneTimeTokenPurpose::OAuthLogin => "nc_oc_",
        }
    }

    /// Emailed links replace each other; OAuth login codes are independent per device.
    pub fn supersedes_pending_tokens(self) -> bool {
        match self {
            OneTimeTokenPurpose::EmailVerification | OneTimeTokenPurpose::PasswordReset => true,
            OneTimeTokenPurpose::OAuthLogin => false,
        }
    }

    pub fn lifetime(self) -> Duration {
        match self {
            OneTimeTokenPurpose::EmailVerification => Duration::hours(24),
            OneTimeTokenPurpose::PasswordReset => Duration::hours(1),
            // Only bridges the OAuth redirect to the app's code exchange.
            OneTimeTokenPurpose::OAuthLogin => Duration::minutes(2),
        }
    }
}
