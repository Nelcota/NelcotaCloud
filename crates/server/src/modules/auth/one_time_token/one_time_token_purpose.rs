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
            Self::EmailVerification => "email_verification",
            Self::PasswordReset => "password_reset",
            Self::OAuthLogin => "oauth_login",
        }
    }

    pub fn token_prefix(self) -> &'static str {
        match self {
            Self::EmailVerification => "nc_ev_",
            Self::PasswordReset => "nc_pr_",
            Self::OAuthLogin => "nc_oc_",
        }
    }

    /// Emailed links replace each other; OAuth login codes are independent per device.
    pub fn supersedes_pending_tokens(self) -> bool {
        match self {
            Self::EmailVerification | Self::PasswordReset => true,
            Self::OAuthLogin => false,
        }
    }

    pub fn lifetime(self) -> Duration {
        match self {
            Self::EmailVerification => Duration::hours(24),
            Self::PasswordReset => Duration::hours(1),
            // Only bridges the OAuth redirect to the app's code exchange.
            Self::OAuthLogin => Duration::minutes(2),
        }
    }
}
