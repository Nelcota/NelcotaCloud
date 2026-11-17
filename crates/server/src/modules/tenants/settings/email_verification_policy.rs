use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::modules::tenants::rejection::tenants_rejection::TenantsRejection;
use crate::modules::tenants::settings::tenant_settings_repository::find_require_email_verification;
use crate::shared::http::api_error::ApiError;

/// Whether password login and refresh need a verified email in this tenant.
pub async fn requires_email_verification(
    control_plane_pool: &PgPool,
    tenant_id: Uuid,
) -> Result<bool, ApiError> {
    let requirement = find_require_email_verification(control_plane_pool, tenant_id).await?;
    let Some(requirement) = requirement else {
        return Err(ApiError::internal(format!("tenant {tenant_id} not found")));
    };

    Ok(requirement)
}

/// Refuses an account whose email is unverified while the tenant requires verification.
pub async fn ensure_email_verified(
    control_plane_pool: &PgPool,
    tenant_id: Uuid,
    email_verified_at: Option<OffsetDateTime>,
) -> Result<(), ApiError> {
    if email_verified_at.is_some() {
        return Ok(());
    }

    if requires_email_verification(control_plane_pool, tenant_id).await? {
        return Err(ApiError::from(TenantsRejection::EmailNotVerified));
    }

    Ok(())
}
