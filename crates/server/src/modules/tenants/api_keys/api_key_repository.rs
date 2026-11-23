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

/// An active key found by its hash: which key it is, and whom it belongs to.
#[derive(Debug, Clone, Copy)]
pub struct ActiveApiKey {
    pub id: Uuid,
    pub owner: ApiKeyOwner,
}

/// A key ready to store: its hash and last characters, plus the key itself when it is public.
pub struct StoredApiKey<'a> {
    pub id: Uuid,
    pub owner: ApiKeyOwner,
    pub key_hash: &'a TokenHash,
    pub key_hint: &'a str,
    pub name: &'a str,
    pub publishable_key: Option<&'a str>,
}

pub async fn insert_api_key(
    connection: &mut PgConnection,
    key: StoredApiKey<'_>,
) -> Result<(), sqlx::Error> {
    let owner = key.owner;
    sqlx::query(
        "INSERT INTO tenant_api_keys (id, tenant_id, kind, key_hash, key_hint, name, publishable_key) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(key.id)
    .bind(owner.tenant_id)
    .bind(owner.kind.as_str())
    .bind(key.key_hash)
    .bind(key.key_hint)
    .bind(key.name)
    .bind(key.publishable_key)
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn find_active_api_key(
    pool: &PgPool,
    key_hash: &[u8],
) -> Result<Option<ActiveApiKey>, ApiKeyLookupError> {
    let row: Option<(Uuid, Uuid, String)> = sqlx::query_as(
        "SELECT id, tenant_id, kind FROM tenant_api_keys WHERE key_hash = $1 AND revoked_at IS NULL",
    )
    .bind(key_hash)
    .fetch_optional(pool)
    .await?;
    let Some((id, tenant_id, raw_kind)) = row else {
        return Ok(None);
    };
    let kind = ApiKeyKind::parse(&raw_kind).ok_or(ApiKeyLookupError::UnknownKind)?;

    Ok(Some(ActiveApiKey {
        id,
        owner: ApiKeyOwner { tenant_id, kind },
    }))
}

/// Stamps the key as used now, unless it was already stamped within `interval_seconds` (by this
/// or another instance) or has been revoked meanwhile.
pub async fn record_api_key_use(
    pool: &PgPool,
    key_id: Uuid,
    interval_seconds: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE tenant_api_keys SET last_used_at = now() WHERE id = $1 AND revoked_at IS NULL AND (last_used_at IS NULL OR last_used_at < now() - make_interval(secs => $2))",
    )
    .bind(key_id)
    .bind(interval_seconds)
    .execute(pool)
    .await?;

    Ok(())
}

const REVOKED_PAGE_SIZE: usize = 50;
const REVOKED_PAGE_LOOKAHEAD: i64 = 51;

/// Return the active keys on the first page, followed by bounded pages of revoked keys.
pub async fn list_api_keys(
    pool: &PgPool,
    tenant_id: Uuid,
    before: Option<Uuid>,
) -> Result<(Vec<ApiKeySummary>, Option<Uuid>), sqlx::Error> {
    let mut keys: Vec<ApiKeySummary> = sqlx::query_as(
        "WITH revoked AS (
            SELECT * FROM tenant_api_keys
            WHERE tenant_id = $1 AND revoked_at IS NOT NULL
              AND ($2::uuid IS NULL OR (created_at, id) < (
                  SELECT created_at, id FROM tenant_api_keys
                  WHERE tenant_id = $1 AND id = $2 AND revoked_at IS NOT NULL
              ))
            ORDER BY created_at DESC, id DESC LIMIT $3
         )
         SELECT id, kind, name, COALESCE(key_hint, '') AS hint, publishable_key AS key, created_at, revoked_at, last_used_at
         FROM (
            SELECT * FROM tenant_api_keys WHERE tenant_id = $1 AND revoked_at IS NULL AND $2::uuid IS NULL
            UNION ALL SELECT * FROM revoked
         ) AS page
         ORDER BY created_at DESC, id DESC",
    )
    .bind(tenant_id)
    .bind(before)
    .bind(REVOKED_PAGE_LOOKAHEAD)
    .fetch_all(pool)
    .await?;
    let extra = keys
        .iter()
        .enumerate()
        .filter(|(_, key)| key.revoked_at.is_some())
        .nth(REVOKED_PAGE_SIZE)
        .map(|(index, _)| index);
    let next = extra.and_then(|index| {
        keys.remove(index);
        keys.iter()
            .rev()
            .find(|key| key.revoked_at.is_some())
            .map(|key| key.id)
    });

    Ok((keys, next))
}
