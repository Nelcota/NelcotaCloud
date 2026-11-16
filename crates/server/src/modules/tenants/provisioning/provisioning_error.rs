use crate::modules::tenants::database::tenant_database_server::TenantDatabaseError;
use crate::modules::tenants::signing_keys::signing_key::SigningKeyError;
use crate::shared::crypto::secret_box::SecretBoxError;

#[derive(Debug, thiserror::Error)]
pub enum ProvisioningError {
    #[error("tenant slug is already taken")]
    SlugTaken,
    #[error("an account can own at most {0} projects")]
    ProjectLimitReached(i64),
    #[error("database error while provisioning tenant: {0}")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    TenantDatabase(TenantDatabaseError),
    #[error(transparent)]
    SigningKey(#[from] SigningKeyError),
    #[error(transparent)]
    Encryption(#[from] SecretBoxError),
}

impl From<TenantDatabaseError> for ProvisioningError {
    /// An existing database means another tenant already claimed the slug.
    fn from(error: TenantDatabaseError) -> Self {
        match error {
            TenantDatabaseError::AlreadyExists => Self::SlugTaken,
            other => Self::TenantDatabase(other),
        }
    }
}
