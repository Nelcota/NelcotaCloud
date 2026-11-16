use std::sync::Arc;

use oauth2::url::ParseError;

use crate::modules::oauth::identity::account_linker::AccountLinkError;
use crate::modules::oauth::login::oauth_state_repository::OAuthStateError;
use crate::modules::oauth::profile::provider_profile::ProfileError;
use crate::modules::oauth::provider::oauth_provider_repository::ProviderCredentialsError;
use crate::modules::tenants::database::tenant_pool_registry::TenantPoolError;
use crate::shared::crypto::secret_box::SecretBoxError;

#[derive(Debug, thiserror::Error)]
pub enum OAuthLoginError {
    #[error("OAuth provider is not configured for this tenant")]
    ProviderNotConfigured,
    #[error("the user denied access or the provider returned no code")]
    ProviderDenied,
    #[error("invalid OAuth endpoint URL: {0}")]
    InvalidEndpoint(#[from] ParseError),
    #[error(transparent)]
    Credentials(#[from] ProviderCredentialsError),
    #[error("database error during OAuth login: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
    #[error("stored PKCE verifier is not valid UTF-8")]
    InvalidVerifier,
    #[error("failed to exchange the authorization code: {0}")]
    TokenExchange(String),
    #[error(transparent)]
    Profile(#[from] ProfileError),
    #[error(transparent)]
    AccountLink(#[from] AccountLinkError),
    #[error(transparent)]
    TenantDatabase(#[from] Arc<TenantPoolError>),
    #[error(transparent)]
    State(#[from] OAuthStateError),
}

impl OAuthLoginError {
    /// The `error` query parameter sent back to the tenant's app; never internal details.
    pub fn redirect_error_code(&self) -> &'static str {
        match self {
            Self::ProviderDenied => "access_denied",
            Self::AccountLink(AccountLinkError::NoVerifiedEmail) => "email_not_verified",
            Self::AccountLink(AccountLinkError::ProviderAccountMismatch) => "account_conflict",
            _ => "server_error",
        }
    }

    /// A refusal caused by the user or their provider account, not a failure of this server.
    pub fn is_refusal(&self) -> bool {
        matches!(
            self,
            Self::ProviderDenied
                | Self::AccountLink(
                    AccountLinkError::NoVerifiedEmail | AccountLinkError::ProviderAccountMismatch
                )
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_caused_outcomes_are_refusals() {
        for error in [
            OAuthLoginError::ProviderDenied,
            OAuthLoginError::AccountLink(AccountLinkError::NoVerifiedEmail),
            OAuthLoginError::AccountLink(AccountLinkError::ProviderAccountMismatch),
        ] {
            assert!(error.is_refusal());
        }
    }

    #[test]
    fn server_failures_are_not_refusals() {
        for error in [
            OAuthLoginError::InvalidVerifier,
            OAuthLoginError::TokenExchange("timeout".to_owned()),
            OAuthLoginError::Database(sqlx::Error::PoolTimedOut),
        ] {
            assert!(error.is_refusal() == false);
        }
    }
}
