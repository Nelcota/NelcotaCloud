use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;

#[derive(Debug, thiserror::Error)]
pub enum ApiKeyRevocationError {
    #[error("API key not found or already revoked")]
    NotFound,
    #[error("the last active secret key cannot be revoked; create another one first")]
    LastSecretKey,
    #[error("database error while revoking API key: {0}")]
    Database(#[from] sqlx::Error),
}

/// Revokes a key of the tenant at once. The last active secret key is kept, or nobody could
/// manage the tenant anymore.
///
/// The tenant's active secret keys are locked first, so two revocations racing for the last
/// two secret keys cannot both succeed.
pub async fn revoke_api_key(
    pool: &PgPool,
    tenant_id: Uuid,
    key_id: Uuid,
) -> Result<(), ApiKeyRevocationError> {
    let mut transaction = pool.begin().await?;
    let active_secret_keys = lock_active_secret_keys(&mut transaction, tenant_id).await?;

    if active_secret_keys.as_slice() == [key_id] {
        return Err(ApiKeyRevocationError::LastSecretKey);
    }

    if mark_revoked(&mut transaction, tenant_id, key_id).await? == false {
        return Err(ApiKeyRevocationError::NotFound);
    }

    transaction.commit().await?;

    Ok(())
}

async fn lock_active_secret_keys(
    connection: &mut PgConnection,
    tenant_id: Uuid,
) -> Result<Vec<Uuid>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT id FROM tenant_api_keys WHERE tenant_id = $1 AND kind = $2 AND revoked_at IS NULL FOR UPDATE",
    )
    .bind(tenant_id)
    .bind(ApiKeyKind::Secret.as_str())
    .fetch_all(connection)
    .await
}

/// `false` when the tenant has no such key still active.
async fn mark_revoked(
    connection: &mut PgConnection,
    tenant_id: Uuid,
    key_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let revoked: Option<Uuid> = sqlx::query_scalar(
        "UPDATE tenant_api_keys SET revoked_at = now() WHERE id = $1 AND tenant_id = $2 AND revoked_at IS NULL RETURNING id",
    )
    .bind(key_id)
    .bind(tenant_id)
    .fetch_optional(connection)
    .await?;

    Ok(revoked.is_some())
}
