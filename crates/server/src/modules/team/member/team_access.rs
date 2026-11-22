use sqlx::Postgres;
use sqlx::pool::PoolConnection;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::integration::team_notifications::EmailAddress;
use crate::modules::team::member::account_removal::active_accounts;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::settings::email_verification_policy::requires_email_verification;
use crate::shared::http::api_error::ApiError;

/// Invites belong to the verified address on the current platform account.
pub fn invited_email_of(account: &PlatformAccount) -> Result<EmailAddress, ApiError> {
    if account.is_email_verified == false {
        return Err(TenantsRejection::EmailNotVerified.into());
    }

    EmailAddress::parse(&account.email).map_err(|_| ApiError::NotFound("invitation"))
}

pub struct TeamAccounts {
    connection: PoolConnection<Postgres>,
    requires_verification: bool,
}

impl TeamAccounts {
    /// Acquire the platform connection before locking a project in the control plane.
    pub async fn open(state: &AppState) -> Result<Self, ApiError> {
        let tenant_id = state.platform_tenant.find_id().await?;
        let requires_verification =
            requires_email_verification(&state.control_plane_pool, tenant_id).await?;
        let pool = state
            .tenant_pools
            .pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let connection = pool.acquire().await?;

        Ok(Self {
            connection,
            requires_verification,
        })
    }

    pub async fn has_active(&mut self, candidates: &[Uuid]) -> Result<bool, sqlx::Error> {
        let active =
            active_accounts(&mut self.connection, candidates, self.requires_verification).await?;

        Ok(active.is_empty() == false)
    }
}
