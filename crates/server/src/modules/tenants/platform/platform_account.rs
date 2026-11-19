use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use sqlx::PgPool;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::modules::tenants::platform::platform_account_status::{
    PlatformAccountStatus, find_platform_account_status,
};
use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::settings::email_verification_policy::ensure_email_verified;
use crate::modules::tenants::signing_keys::access_token::TokenAudience;
use crate::modules::tenants::signing_keys::access_token_verification::verify_tenant_token;
use crate::shared::http::api_error::ApiError;
use crate::shared::http::bearer_token::bearer_token;

/// Someone logged into the console: a user of the platform tenant, proven by their access
/// token, which must have been issued by the platform tenant itself.
pub struct PlatformAccount {
    pub account_id: Uuid,
    pub email: String,
    /// Accepting invitations always needs it, whatever the platform tenant requires.
    pub is_email_verified: bool,
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
    let audience = TokenAudience {
        issuer: &state.settings.token_issuer,
        tenant_id: platform_tenant_id,
    };
    let claims = verify_tenant_token(&state.signing_keys, &audience, access_token).await?;
    let status = account_status(state, platform_tenant_id, claims.sub).await?;
    let pool = &state.control_plane_pool;
    ensure_account_allowed(pool, platform_tenant_id, &status).await?;

    Ok(PlatformAccount {
        account_id: claims.sub,
        email: status.email,
        is_email_verified: status.email_verified_at.is_some(),
    })
}

/// Distinct errors, so the console can ask the account to confirm its email. Verification
/// follows the platform tenant's own setting, so an instance without an email provider keeps
/// working.
async fn ensure_account_allowed(
    control_plane_pool: &PgPool,
    platform_tenant_id: Uuid,
    status: &PlatformAccountStatus,
) -> Result<(), ApiError> {
    if status.banned_at.is_some() {
        return Err(ApiError::from(TenantsRejection::UserBanned));
    }

    ensure_email_verified(
        control_plane_pool,
        platform_tenant_id,
        status.email_verified_at,
    )
    .await
}

async fn account_status(
    state: &AppState,
    platform_tenant_id: Uuid,
    account_id: Uuid,
) -> Result<PlatformAccountStatus, ApiError> {
    let platform_pool = state
        .tenant_pools
        .pool_for(platform_tenant_id)
        .await
        .map_err(ApiError::internal)?;
    let status = find_platform_account_status(&platform_pool, account_id).await?;
    let status = status.ok_or(TenantsRejection::InvalidAccessToken)?;

    Ok(status)
}
