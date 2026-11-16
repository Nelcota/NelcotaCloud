use oauth2::url::ParseError;

use crate::modules::auth::one_time_token::one_time_token_repository::IssueOneTimeTokenError;
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
    TenantDatabase(#[from] TenantPoolError),
    #[error(transparent)]
    State(#[from] OAuthStateError),
    #[error(transparent)]
    LoginCode(#[from] IssueOneTimeTokenError),
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
}
