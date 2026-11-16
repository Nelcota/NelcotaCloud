use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;
use crate::modules::tenants::api_keys::api_key_summary::ApiKeySummary;
use crate::shared::crypto::opaque_token::TokenHash;

#[derive(Debug, thiserror::Error)]
pub enum ApiKeyLookupError {
    #[error("database error while looking up API key: {0}")]
    Database(#[from] sqlx::Error),
    #[error("stored API key has an unknown kind")]
    UnknownKind,
}

#[derive(Debug, Clone, Copy)]
pub struct ApiKeyOwner {
    pub tenant_id: Uuid,
    pub kind: ApiKeyKind,
}

/// A key ready to store: only its hash and last characters are kept.
pub struct StoredApiKey<'a> {
    pub id: Uuid,
    pub owner: ApiKeyOwner,
    pub key_hash: &'a TokenHash,
    pub key_hint: &'a str,
    pub name: &'a str,
}

pub async fn insert_api_key(
    connection: &mut PgConnection,
    key: StoredApiKey<'_>,
) -> Result<(), sqlx::Error> {
    let owner = key.owner;
    sqlx::query(
        "INSERT INTO tenant_api_keys (id, tenant_id, kind, key_hash, key_hint, name) VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(key.id)
    .bind(owner.tenant_id)
    .bind(owner.kind.as_str())
    .bind(key.key_hash)
    .bind(key.key_hint)
    .bind(key.name)
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn find_active_api_key_owner(
    pool: &PgPool,
    key_hash: &[u8],
) -> Result<Option<ApiKeyOwner>, ApiKeyLookupError> {
    let row: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT tenant_id, kind FROM tenant_api_keys WHERE key_hash = $1 AND revoked_at IS NULL",
    )
    .bind(key_hash)
    .fetch_optional(pool)
    .await?;
    let Some((tenant_id, raw_kind)) = row else {
        return Ok(None);
    };
    let Some(kind) = ApiKeyKind::parse(&raw_kind) else {
        return Err(ApiKeyLookupError::UnknownKind);
    };

    Ok(Some(ApiKeyOwner { tenant_id, kind }))
}

/// Every key of the tenant, newest first, revoked ones included.
pub async fn list_api_keys(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<ApiKeySummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, kind, name, COALESCE(key_hint, '') AS hint, created_at, revoked_at FROM tenant_api_keys WHERE tenant_id = $1 ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await
}
