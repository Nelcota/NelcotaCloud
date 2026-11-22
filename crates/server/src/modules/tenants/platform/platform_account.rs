use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::auth::integration::session_token::verify_session_token;
use crate::modules::auth::session::session_access::require_active_session;
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::settings::email_verification_policy::ensure_email_verified;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;

/// Someone logged into the console: a user of the platform tenant, proven by their access
/// token, which must have been issued by the platform tenant itself.
pub struct PlatformAccount {
    pub account_id: Uuid,
    session_id: Uuid,
    pub email: String,
    /// Accepting invitations always needs it, whatever the platform tenant requires.
    pub is_email_verified: bool,
}

impl PlatformAccount {
    /// Hold the user row while creating a membership, so account erasure sees every project.
    pub async fn lock_active(
        &self,
        state: &AppState,
    ) -> Result<(Transaction<'static, Postgres>, Self), ApiError> {
        let tenant_id = state.platform_tenant.find_id().await?;
        let pool = state
            .tenant_pools
            .pool_for(tenant_id)
            .await
            .map_err(ApiError::internal)?;
        let mut transaction = pool.begin().await?;
        sqlx::query("SELECT id FROM users WHERE id = $1 FOR SHARE")
            .bind(self.account_id)
            .execute(&mut *transaction)
            .await?;
        let status =
            require_active_session(&mut *transaction, self.account_id, self.session_id).await?;
        ensure_email_verified(
            &state.control_plane_pool,
            tenant_id,
            status.email_verified_at,
        )
        .await?;
        let account = Self {
            account_id: self.account_id,
            session_id: self.session_id,
            email: status.email,
            is_email_verified: status.email_verified_at.is_some(),
        };

        Ok((transaction, account))
    }
}

impl FromRequestParts<AppState> for PlatformAccount {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let access_token = bearer_token(parts).ok_or(TenantsRejection::InvalidAccessToken)?;

        verify_platform_token(state, access_token).await
    }
}

pub async fn verify_platform_token(
    state: &AppState,
    access_token: &str,
) -> Result<PlatformAccount, ApiError> {
    let platform_tenant_id = state.platform_tenant.find_id().await?;
    let (claims, status) = verify_session_token(state, platform_tenant_id, access_token).await?;
    ensure_email_verified(
        &state.control_plane_pool,
        platform_tenant_id,
        status.email_verified_at,
    )
    .await?;

    Ok(PlatformAccount {
        account_id: claims.sub,
        session_id: claims.sid,
        email: status.email,
        is_email_verified: status.email_verified_at.is_some(),
    })
}
