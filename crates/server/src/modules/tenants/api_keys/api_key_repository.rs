use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::modules::tenants::api_keys::api_key_kind::ApiKeyKind;

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

pub async fn insert_api_key(
    connection: &mut PgConnection,
    owner: ApiKeyOwner,
    key_hash: &[u8],
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tenant_api_keys (id, tenant_id, kind, key_hash) VALUES ($1, $2, $3, $4)",
    )
    .bind(Uuid::new_v4())
    .bind(owner.tenant_id)
    .bind(owner.kind.as_str())
    .bind(key_hash)
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
