use axum::extract::{FromRequestParts, Path};
use axum::http::request::Parts;
use serde::Deserialize;
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::cache::rejection::CacheRejection;
use crate::modules::tenants::platform::membership_repository::lock_project_memberships;
use crate::modules::tenants::platform::platform_account::PlatformAccount;
use crate::modules::tenants::platform::project_access::require_owner;
use crate::modules::tenants::platform::project_role::ProjectRole;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::request_span::record_tenant;

#[derive(Deserialize)]
struct CachePath {
    project_id: Uuid,
    credential_id: Option<Uuid>,
}

pub struct ProjectCacheOwner {
    pub pool: PgPool,
    pub tenant_id: Uuid,
    pub is_configured: bool,
    pub credential_id: Option<Uuid>,
    account_id: Uuid,
}

impl FromRequestParts<AppState> for ProjectCacheOwner {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let account = PlatformAccount::from_request_parts(parts, state).await?;
        let Path(path) = Path::<CachePath>::from_request_parts(parts, state)
            .await
            .map_err(ApiError::invalid_request)?;
        let pool = &state.control_plane_pool;
        require_owner(pool, path.project_id, &account).await?;
        record_tenant(path.project_id);

        Ok(Self {
            pool: pool.clone(),
            tenant_id: path.project_id,
            is_configured: state.cache_store.is_some(),
            credential_id: path.credential_id,
            account_id: account.account_id,
        })
    }
}

impl ProjectCacheOwner {
    pub async fn begin(&self) -> Result<Transaction<'_, Postgres>, ApiError> {
        let mut transaction = self.pool.begin().await?;
        let members = lock_project_memberships(&mut transaction, self.tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let role = members
            .role_of(self.account_id)
            .map_err(ApiError::internal)?;

        if role != Some(ProjectRole::Owner) {
            return Err(CacheRejection::OwnerRequired.into());
        }

        Ok(transaction)
    }

    pub fn require_configured(&self) -> Result<(), ApiError> {
        if self.is_configured == false {
            return Err(CacheRejection::Unavailable.into());
        }

        Ok(())
    }
}
